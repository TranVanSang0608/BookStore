import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { toSlug } from '../../lib/slug';
import { AppError } from '../../middleware/error';
import type { AdminListBooksQuery, CreateBookInput, UpdateBookInput } from './book.schemas';
import type { ListBooksQuery } from './book.schemas';

// Các field cần cho 1 card sách ngoài trang list (không lấy description dài, isbn... cho nhẹ).
// Export để author.service tái dùng khi trả danh sách sách của tác giả.
export const bookCardSelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  stock_quantity: true,
  cover_image_url: true,
  avg_rating: true, // Phase 8: hiện sao trên thẻ sách
  review_count: true,
  author: { select: { id: true, name: true } },
} satisfies Prisma.BookSelect;

export async function listBooks(query: ListBooksQuery) {
  // Trang public chỉ thấy sách đang bán — sách bị admin ẩn (is_active=false) không bao giờ lộ ra
  const where: Prisma.BookWhereInput = { is_active: true };

  if (query.q) {
    // ILIKE trên title HOẶC tên tác giả (mode 'insensitive' = không phân biệt hoa thường)
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { author: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }

  if (query.category) {
    // Quan hệ n-n: "sách có ÍT NHẤT 1 dòng BookCategory trỏ tới category mang slug này"
    where.categories = { some: { category: { slug: query.category } } };
  }

  if (query.price_min !== undefined || query.price_max !== undefined) {
    // gte/lte = undefined sẽ được Prisma bỏ qua, không cần if riêng từng đầu
    where.price = { gte: query.price_min, lte: query.price_max };
  }

  const orderBy: Prisma.BookOrderByWithRelationInput =
    query.sort === 'price_asc'
      ? { price: 'asc' }
      : query.sort === 'price_desc'
        ? { price: 'desc' }
        : { created_at: 'desc' }; // 'newest' mặc định

  // Phân trang offset: trang 2, limit 12 → bỏ qua 12 sách đầu, lấy 12 sách tiếp.
  // findMany + count chạy song song (cùng where) — không cần transaction vì chỉ đọc.
  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: bookCardSelect,
    }),
    prisma.book.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

// Lấy nhiều sách theo danh sách id — phục vụ guest cart (localStorage chỉ lưu book_id + qty,
// trang giỏ gọi endpoint này để lấy title/giá/tồn HIỆN TẠI; cố tình không lưu snapshot giá
// vào localStorage vì giá có thể đổi — SNAPSHOT principle chỉ áp dụng cho Order)
export function listBooksByIds(ids: number[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.book.findMany({
    where: { id: { in: ids }, is_active: true }, // sách bị ẩn vắng mặt → FE hiện cảnh báo
    select: bookCardSelect,
  });
}

export async function getBookBySlug(slug: string) {
  // findFirst (không phải findUnique) vì where có thêm điều kiện is_active —
  // sách bị ẩn coi như không tồn tại với khách (trả 404, không phải 403)
  const book = await prisma.book.findFirst({
    where: { slug, is_active: true },
    include: {
      author: { select: { id: true, name: true } },
      categories: { include: { category: true } },
    },
  });
  if (!book) throw new AppError(404, 'Không tìm thấy sách');

  // Làm phẳng bảng junction: [{book_id, category_id, category: {...}}] → [{id, name, slug}]
  return { ...book, categories: book.categories.map((bc) => bc.category) };
}

// Sách "liên quan" (Phase 8 — recommend KHÔNG collaborative filtering, D59):
// cùng tác giả HOẶC chung ít nhất 1 thể loại, loại chính nó, chỉ sách đang bán, tối đa 6.
export async function getRelatedBooks(slug: string) {
  const book = await prisma.book.findFirst({
    where: { slug, is_active: true },
    select: { id: true, author_id: true, categories: { select: { category_id: true } } },
  });
  if (!book) return [];

  const categoryIds = book.categories.map((c) => c.category_id);
  return prisma.book.findMany({
    where: {
      is_active: true,
      id: { not: book.id }, // không gợi ý chính nó
      OR: [
        { author_id: book.author_id },
        { categories: { some: { category_id: { in: categoryIds } } } },
      ],
    },
    orderBy: { created_at: 'desc' },
    take: 6,
    select: bookCardSelect, // đã gồm avg_rating/review_count
  });
}

// ---------- Phần admin (các hàm dưới đây chỉ được gọi sau auth + adminOnly) ----------

// Sinh slug duy nhất từ title: thử "dac-nhan-tam", nếu DB đã có thì "dac-nhan-tam-2", "-3"...
// Slug chỉ sinh 1 lần lúc TẠO sách, update không đổi slug — URL đã chia sẻ không bị chết.
async function uniqueBookSlug(title: string) {
  const base = toSlug(title) || 'sach'; // đề phòng title toàn ký tự đặc biệt → slug rỗng
  let slug = base;
  for (let i = 2; await prisma.book.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

// Kiểm tra FK trước khi ghi: author/category không tồn tại thì trả 400 với thông báo
// tiếng Việt rõ ràng, thay vì để Prisma ném lỗi FK khó hiểu (thành 500).
async function ensureAuthorAndCategories(authorId: number, categoryIds: number[]) {
  const author = await prisma.author.findUnique({ where: { id: authorId } });
  if (!author) throw new AppError(400, 'Tác giả không tồn tại');

  const found = await prisma.category.count({ where: { id: { in: categoryIds } } });
  if (found !== categoryIds.length) throw new AppError(400, 'Có thể loại không tồn tại');
}

export async function adminListBooks(query: AdminListBooksQuery) {
  // Khác listBooks public: KHÔNG lọc is_active — admin phải thấy cả sách đang ẩn
  const where: Prisma.BookWhereInput = {};
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { author: { name: { contains: query.q, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: { ...bookCardSelect, is_active: true, created_at: true },
    }),
    prisma.book.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

// Cho form sửa sách: lấy theo id, KHÔNG lọc is_active (admin phải sửa được cả sách đang ẩn)
export async function getAdminBookById(id: number) {
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      categories: { include: { category: true } },
    },
  });
  if (!book) throw new AppError(404, 'Không tìm thấy sách');
  return { ...book, categories: book.categories.map((bc) => bc.category) };
}

export async function createBook(input: CreateBookInput) {
  await ensureAuthorAndCategories(input.author_id, input.category_ids);

  // Lưu ý trade-off: check slug unique nằm NGOÀI transaction — 2 admin tạo sách trùng
  // title cùng lúc vẫn có thể đụng unique constraint của DB (lỗi P2002). DB là lớp chặn
  // cuối nên dữ liệu không bao giờ hỏng; với đồ án 1 admin, không xử lý retry cho đơn giản.
  const slug = await uniqueBookSlug(input.title);

  // category_ids không phải cột của bảng Book — tách ra để ghi vào bảng junction
  const { category_ids, ...bookData } = input;

  // Transaction: tạo sách + gắn thể loại phải đi cùng nhau —
  // nếu bước gắn thể loại lỗi thì sách cũng không được tạo (không có sách "mồ côi" thể loại)
  return prisma.$transaction(async (tx) => {
    const book = await tx.book.create({ data: { ...bookData, slug } });
    await tx.bookCategory.createMany({
      data: category_ids.map((category_id) => ({ book_id: book.id, category_id })),
    });
    return book;
  });
}

export async function updateBook(id: number, input: UpdateBookInput) {
  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Không tìm thấy sách');

  await ensureAuthorAndCategories(input.author_id, input.category_ids);
  const { category_ids, ...bookData } = input;

  // Thay toàn bộ thể loại: xóa hết liên kết cũ rồi tạo lại theo danh sách mới.
  // Đơn giản hơn nhiều so với tính diff thêm/bớt — với vài thể loại/sách thì chi phí không đáng kể.
  return prisma.$transaction(async (tx) => {
    const book = await tx.book.update({ where: { id }, data: bookData }); // slug giữ nguyên
    await tx.bookCategory.deleteMany({ where: { book_id: id } });
    await tx.bookCategory.createMany({
      data: category_ids.map((category_id) => ({ book_id: id, category_id })),
    });
    return book;
  });
}

export async function setBookActive(id: number, isActive: boolean) {
  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Không tìm thấy sách');

  // Sách KHÔNG có hard delete — chỉ ẩn (is_active=false): đơn hàng cũ vẫn cần FK tới sách
  return prisma.book.update({ where: { id }, data: { is_active: isActive } });
}
