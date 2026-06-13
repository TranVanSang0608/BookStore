import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { bookCardSelect } from '../catalog/book.service';
import type { MergeCartInput } from './schemas';

// Trần số lượng mỗi dòng giỏ — khớp với max(99) trong schemas.ts
const MAX_QTY_PER_LINE = 99;

// Thông tin sách cho 1 dòng giỏ: như card ngoài trang list + is_active
// để FE cảnh báo "sách này không còn bán" thay vì lẳng lặng biến mất
const cartBookSelect = { ...bookCardSelect, is_active: true } satisfies Prisma.BookSelect;

export async function getCart(userId: number) {
  // Quan hệ 1-1 User–Cart (user_id @unique) nên tra bằng findUnique theo user_id.
  // CHƯA có cart → trả giỏ rỗng, KHÔNG tạo row — thao tác ĐỌC không được phép GHI
  const cart = await prisma.cart.findUnique({
    where: { user_id: userId },
    include: {
      items: {
        include: { book: { select: cartBookSelect } },
        orderBy: { id: 'asc' }, // thứ tự thêm vào giỏ ổn định trên UI
      },
    },
  });
  if (!cart) return { items: [], subtotal: 0 };

  const items = cart.items.map((item) => ({
    book_id: item.book_id,
    quantity: item.quantity,
    book: item.book,
  }));

  // Subtotal chỉ tính sách còn bán — dòng "chết" hiển thị cảnh báo chứ không tính tiền
  const subtotal = items
    .filter((item) => item.book.is_active)
    .reduce((sum, item) => sum + item.book.price * item.quantity, 0);

  return { items, subtotal };
}

// Lazy-create: cart chỉ sinh ra khi user lần đầu GHI vào giỏ.
// upsert theo user_id là idempotent — gọi bao nhiêu lần cũng chỉ có đúng 1 cart
async function getOrCreateCart(userId: number) {
  return prisma.cart.upsert({
    where: { user_id: userId },
    create: { user_id: userId },
    update: {},
  });
}

// Sách phải tồn tại và đang bán mới được thao tác giỏ — sách bị admin ẩn coi như không còn
async function getActiveBookOr400(bookId: number) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || !book.is_active) throw new AppError(400, 'Sách không còn bán');
  return book;
}

// Chặn số lượng vượt tồn kho / vượt trần — dùng cho hành động CHỦ ĐỘNG của user
// (thêm/sửa giỏ): trả lỗi rõ ràng để user biết, khác với merge (clamp êm, xem dưới)
function ensureQtyAvailable(qty: number, stock: number) {
  if (stock === 0) throw new AppError(400, 'Sách đã hết hàng');
  if (qty > stock) throw new AppError(400, `Chỉ còn ${stock} cuốn trong kho`);
  if (qty > MAX_QTY_PER_LINE) throw new AppError(400, `Tối đa ${MAX_QTY_PER_LINE} cuốn mỗi sách`);
}

export async function addItem(userId: number, bookId: number, quantity: number) {
  const book = await getActiveBookOr400(bookId);
  const cart = await getOrCreateCart(userId);

  // Add = CỘNG DỒN (giống Shopee): đã có 2 cuốn, thêm 3 → 5 cuốn.
  //
  // Cộng dồn ATOMIC bằng `increment` của Prisma (UPDATE ... SET quantity = quantity + n
  // ở DB) thay vì đọc-rồi-ghi: nếu 2 request thêm cùng sách chạy song song, cách đọc-rồi-ghi
  // khiến cả hai đọc cùng quantity cũ rồi đè nhau → mất một lần cộng. increment thì DB tự
  // cộng nên không bao giờ mất lượt.
  //
  // Bọc trong $transaction: increment xong mới biết tổng cuối để so tồn kho — nếu vượt thì
  // throw, transaction tự rollback (không để lại dòng quá tồn).
  return prisma.$transaction(async (tx) => {
    const item = await tx.cartItem.upsert({
      where: { cart_id_book_id: { cart_id: cart.id, book_id: bookId } },
      create: { cart_id: cart.id, book_id: bookId, quantity },
      update: { quantity: { increment: quantity } },
    });
    // item.quantity giờ là tổng SAU cộng dồn (atomic) — vượt tồn thì rollback
    ensureQtyAvailable(item.quantity, book.stock_quantity);
    return item;
  });
}

// Tìm dòng giỏ của user theo book_id; không có → 404
// (PUT/DELETE thao tác trên dòng đã tồn tại, khác POST là thêm mới)
async function getLineOr404(userId: number, bookId: number) {
  const cart = await prisma.cart.findUnique({ where: { user_id: userId } });
  const line = cart
    ? await prisma.cartItem.findUnique({
        where: { cart_id_book_id: { cart_id: cart.id, book_id: bookId } },
      })
    : null;
  if (!line) throw new AppError(404, 'Không tìm thấy sách trong giỏ');
  return line;
}

export async function updateItem(userId: number, bookId: number, quantity: number) {
  const line = await getLineOr404(userId, bookId);
  const book = await getActiveBookOr400(bookId);

  // PUT = đặt số lượng TUYỆT ĐỐI (khác POST cộng dồn) — dùng cho ô nhập số trên trang giỏ
  ensureQtyAvailable(quantity, book.stock_quantity);

  return prisma.cartItem.update({ where: { id: line.id }, data: { quantity } });
}

export async function removeItem(userId: number, bookId: number) {
  const line = await getLineOr404(userId, bookId);
  await prisma.cartItem.delete({ where: { id: line.id } });
}

// Merge guest cart (localStorage) vào DB cart khi login.
//
// Vì sao MAX chứ không CỘNG: merge phải IDEMPOTENT — user logout/login nhiều lần
// (hoặc merge bị gọi lặp) không được nhân đôi giỏ. max(guest, db) hiểu là
// "ý định mua lớn nhất user từng thể hiện" — chạy lại bao nhiêu lần kết quả không đổi.
//
// Vì sao KHÔNG BAO GIỜ ném lỗi nghiệp vụ: merge là bước nền chạy ngầm sau đăng nhập —
// một cuốn sách hết hàng/ngừng bán trong lúc nằm ở guest cart không được phép
// làm fail cả flow login. Sách chết → bỏ qua êm; vượt tồn → clamp xuống mức còn lại.
export async function mergeGuestCart(userId: number, input: MergeCartInput) {
  // CHUẨN HÓA payload trước: gom các dòng TRÙNG book_id lấy max.
  // localStorage là input không tin được — có thể bị sửa tay thành
  // [{book_id:1, qty:5}, {book_id:1, qty:3}]. Nếu loop thẳng thì kết quả phụ thuộc thứ tự;
  // gom vào Map (lấy max) đảm bảo đúng "max(qty) per book_id" bất kể payload thế nào.
  const guestMap = new Map<number, number>();
  for (const item of input.items) {
    guestMap.set(item.book_id, Math.max(guestMap.get(item.book_id) ?? 0, item.quantity));
  }

  if (guestMap.size > 0) {
    const cart = await getOrCreateCart(userId);

    // Số lượng đang có sẵn trong DB cart, tra nhanh theo book_id
    const existing = await prisma.cartItem.findMany({ where: { cart_id: cart.id } });
    const dbQty = new Map(existing.map((item) => [item.book_id, item.quantity]));

    // Chỉ lấy sách còn bán — sách bị ẩn/xóa khi đang nằm ở guest cart sẽ vắng mặt trong Map
    const books = await prisma.book.findMany({
      where: { id: { in: [...guestMap.keys()] }, is_active: true },
      select: { id: true, stock_quantity: true },
    });
    const stockOf = new Map(books.map((book) => [book.id, book.stock_quantity]));

    const upserts = [];
    for (const [bookId, guestQty] of guestMap) {
      const stock = stockOf.get(bookId);
      if (stock === undefined) continue; // sách không còn bán → bỏ qua êm

      const desired = Math.max(guestQty, dbQty.get(bookId) ?? 0);
      const clamped = Math.min(desired, stock, MAX_QTY_PER_LINE);
      if (clamped <= 0) continue; // hết hàng → bỏ qua êm

      upserts.push(
        prisma.cartItem.upsert({
          where: { cart_id_book_id: { cart_id: cart.id, book_id: bookId } },
          create: { cart_id: cart.id, book_id: bookId, quantity: clamped },
          update: { quantity: clamped },
        }),
      );
    }

    // Array transaction: ghi tất cả dòng merge atomic — không có giỏ "merge một nửa"
    if (upserts.length > 0) await prisma.$transaction(upserts);
  }

  // Trả về giỏ hoàn chỉnh sau merge (cùng shape với GET /api/cart) để FE cập nhật ngay
  return getCart(userId);
}
