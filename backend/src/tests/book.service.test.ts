// Unit test cho book service — mock Prisma, không chạm DB thật
import { prisma } from '../lib/prisma';
import {
  createBook,
  getBookBySlug,
  getRelatedBooks,
  listBooks,
  setBookActive,
  updateBook,
} from '../modules/catalog/book.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    book: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    author: {
      findUnique: jest.fn(),
    },
    category: {
      count: jest.fn(),
    },
    bookCategory: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    // $transaction giả: dạng callback thì gọi callback với chính prisma mock (đóng vai tx)
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
    ),
  },
}));

const mockBookFindUnique = prisma.book.findUnique as jest.Mock;
const mockBookFindFirst = prisma.book.findFirst as jest.Mock;
const mockBookFindMany = prisma.book.findMany as jest.Mock;
const mockBookCount = prisma.book.count as jest.Mock;
const mockBookCreate = prisma.book.create as jest.Mock;
const mockBookUpdate = prisma.book.update as jest.Mock;
const mockAuthorFindUnique = prisma.author.findUnique as jest.Mock;
const mockCategoryCount = prisma.category.count as jest.Mock;
const mockJunctionCreateMany = prisma.bookCategory.createMany as jest.Mock;
const mockJunctionDeleteMany = prisma.bookCategory.deleteMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// Query mặc định như sau khi qua Zod (sort/page/limit luôn có nhờ .catch)
const queryMacDinh = { sort: 'newest', page: 1, limit: 12 } as const;

const inputHopLe = {
  title: 'Đắc Nhân Tâm',
  price: 86000,
  stock_quantity: 50,
  author_id: 1,
  category_ids: [1, 2],
};

describe('listBooks', () => {
  it('luôn ép is_active=true — sách bị ẩn không bao giờ lộ ra trang public', async () => {
    mockBookFindMany.mockResolvedValue([]);
    mockBookCount.mockResolvedValue(0);

    await listBooks({ ...queryMacDinh });

    const where = mockBookFindMany.mock.calls[0][0].where;
    expect(where.is_active).toBe(true);
  });

  it('q → tìm ILIKE trên cả title lẫn tên tác giả; category → lọc qua junction', async () => {
    mockBookFindMany.mockResolvedValue([]);
    mockBookCount.mockResolvedValue(0);

    await listBooks({ ...queryMacDinh, q: 'ánh', category: 'van-hoc', price_min: 50000, price_max: 200000 });

    const where = mockBookFindMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { title: { contains: 'ánh', mode: 'insensitive' } },
      { author: { name: { contains: 'ánh', mode: 'insensitive' } } },
    ]);
    expect(where.categories).toEqual({ some: { category: { slug: 'van-hoc' } } });
    expect(where.price).toEqual({ gte: 50000, lte: 200000 });
  });

  it('tính đúng skip theo trang và totalPages làm tròn lên', async () => {
    mockBookFindMany.mockResolvedValue([]);
    mockBookCount.mockResolvedValue(25); // 25 sách, limit 12 → 3 trang

    const result = await listBooks({ ...queryMacDinh, page: 3 });

    expect(mockBookFindMany.mock.calls[0][0].skip).toBe(24); // (3-1) × 12
    expect(result.totalPages).toBe(3);
  });
});

describe('getBookBySlug', () => {
  it('ném 404 khi slug không tồn tại hoặc sách đã bị ẩn', async () => {
    mockBookFindFirst.mockResolvedValue(null);

    await expect(getBookBySlug('khong-ton-tai')).rejects.toMatchObject({ statusCode: 404 });
    // Điều kiện is_active nằm ngay trong where — sách ẩn và sách không tồn tại trả lỗi giống nhau
    expect(mockBookFindFirst.mock.calls[0][0].where).toEqual({ slug: 'khong-ton-tai', is_active: true });
  });

  it('làm phẳng bảng junction thành mảng category trực tiếp', async () => {
    mockBookFindFirst.mockResolvedValue({
      id: 1,
      title: 'Nhà Giả Kim',
      categories: [{ book_id: 1, category_id: 2, category: { id: 2, name: 'Văn học', slug: 'van-hoc' } }],
    });

    const book = await getBookBySlug('nha-gia-kim');

    expect(book.categories).toEqual([{ id: 2, name: 'Văn học', slug: 'van-hoc' }]);
  });
});

describe('createBook', () => {
  it('ném 400 khi author_id không tồn tại — không tạo sách', async () => {
    mockAuthorFindUnique.mockResolvedValue(null);

    await expect(createBook(inputHopLe)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockBookCreate).not.toHaveBeenCalled();
  });

  it('ném 400 khi có category_id không tồn tại', async () => {
    mockAuthorFindUnique.mockResolvedValue({ id: 1 });
    mockCategoryCount.mockResolvedValue(1); // gửi 2 id nhưng DB chỉ tìm thấy 1

    await expect(createBook(inputHopLe)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('slug trùng → tự gắn hậu tố -2; tạo sách + gắn thể loại trong transaction', async () => {
    mockAuthorFindUnique.mockResolvedValue({ id: 1 });
    mockCategoryCount.mockResolvedValue(2);
    // Lần 1: "dac-nhan-tam" đã có sách dùng; lần 2: "dac-nhan-tam-2" còn trống
    mockBookFindUnique.mockResolvedValueOnce({ id: 99 }).mockResolvedValueOnce(null);
    mockBookCreate.mockResolvedValue({ id: 13 });

    await createBook(inputHopLe);

    expect(mockBookCreate.mock.calls[0][0].data.slug).toBe('dac-nhan-tam-2');
    // category_ids không được ghi thẳng vào bảng Book mà đi qua bảng junction
    expect(mockBookCreate.mock.calls[0][0].data.category_ids).toBeUndefined();
    expect(mockJunctionCreateMany).toHaveBeenCalledWith({
      data: [
        { book_id: 13, category_id: 1 },
        { book_id: 13, category_id: 2 },
      ],
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe('updateBook', () => {
  it('ném 404 khi sách không tồn tại', async () => {
    mockBookFindUnique.mockResolvedValue(null);

    await expect(updateBook(999, inputHopLe)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('giữ nguyên slug, thay toàn bộ thể loại (xóa hết rồi tạo lại)', async () => {
    mockBookFindUnique.mockResolvedValue({ id: 5, slug: 'dac-nhan-tam' });
    mockAuthorFindUnique.mockResolvedValue({ id: 1 });
    mockCategoryCount.mockResolvedValue(2);
    mockBookUpdate.mockResolvedValue({ id: 5 });

    await updateBook(5, inputHopLe);

    // data update KHÔNG chứa slug — slug bất biến sau khi tạo
    expect(mockBookUpdate.mock.calls[0][0].data.slug).toBeUndefined();
    expect(mockJunctionDeleteMany).toHaveBeenCalledWith({ where: { book_id: 5 } });
    expect(mockJunctionCreateMany).toHaveBeenCalled();
  });
});

describe('setBookActive', () => {
  it('ném 404 khi sách không tồn tại', async () => {
    mockBookFindUnique.mockResolvedValue(null);

    await expect(setBookActive(999, false)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('cập nhật đúng cờ is_active', async () => {
    mockBookFindUnique.mockResolvedValue({ id: 5 });

    await setBookActive(5, false);

    expect(mockBookUpdate).toHaveBeenCalledWith({ where: { id: 5 }, data: { is_active: false } });
  });
});

describe('getRelatedBooks (Phase 8)', () => {
  it('sách không tồn tại → mảng rỗng', async () => {
    (prisma.book.findFirst as jest.Mock).mockResolvedValue(null);
    expect(await getRelatedBooks('khong-co')).toEqual([]);
  });

  it('lọc cùng tác giả HOẶC chung thể loại, loại chính nó, active, take 6', async () => {
    (prisma.book.findFirst as jest.Mock).mockResolvedValue({
      id: 5,
      author_id: 2,
      categories: [{ category_id: 3 }, { category_id: 4 }],
    });
    (prisma.book.findMany as jest.Mock).mockResolvedValue([{ id: 6 }]);

    const res = await getRelatedBooks('mat-biec');
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toMatchObject({
      is_active: true,
      id: { not: 5 },
      OR: [{ author_id: 2 }, { categories: { some: { category_id: { in: [3, 4] } } } }],
    });
    expect(arg.take).toBe(6);
    expect(res).toEqual([{ id: 6 }]);
  });

  it('sách không có thể loại → categoryIds rỗng, vẫn chạy (nhánh tác giả)', async () => {
    (prisma.book.findFirst as jest.Mock).mockResolvedValue({ id: 5, author_id: 2, categories: [] });
    (prisma.book.findMany as jest.Mock).mockResolvedValue([]);

    await getRelatedBooks('khong-the-loai');
    const arg = (prisma.book.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where.OR[1].categories.some.category_id.in).toEqual([]);
  });
});
