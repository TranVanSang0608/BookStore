// Unit test cho cart service — mock Prisma, không chạm DB thật.
// Trọng tâm: logic merge max(qty) (THIET-KE.md mục 9 yêu cầu test riêng) + chặn vượt tồn.
import { prisma } from '../lib/prisma';
import { addItem, getCart, mergeGuestCart, updateItem } from '../modules/cart/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    cart: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    book: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    // $transaction giả: dạng mảng thì chờ tất cả promise, dạng callback thì gọi với prisma mock
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
    ),
  },
}));

const mockCartFindUnique = prisma.cart.findUnique as jest.Mock;
const mockCartUpsert = prisma.cart.upsert as jest.Mock;
const mockItemFindUnique = prisma.cartItem.findUnique as jest.Mock;
const mockItemFindMany = prisma.cartItem.findMany as jest.Mock;
const mockItemUpsert = prisma.cartItem.upsert as jest.Mock;
const mockItemUpdate = prisma.cartItem.update as jest.Mock;
const mockBookFindUnique = prisma.book.findUnique as jest.Mock;
const mockBookFindMany = prisma.book.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCartUpsert.mockResolvedValue({ id: 7, user_id: 1 });
});

const sachConBan = { id: 10, is_active: true, stock_quantity: 20 };

describe('getCart', () => {
  it('chưa có cart → trả giỏ rỗng, KHÔNG tạo row (đọc không được ghi)', async () => {
    mockCartFindUnique.mockResolvedValue(null);

    const cart = await getCart(1);

    expect(cart).toEqual({ items: [], subtotal: 0 });
    expect(mockCartUpsert).not.toHaveBeenCalled();
  });

  it('subtotal chỉ tính sách còn bán — dòng sách bị ẩn không tính tiền', async () => {
    mockCartFindUnique.mockResolvedValue({
      id: 7,
      items: [
        { book_id: 10, quantity: 2, book: { price: 100000, is_active: true } },
        { book_id: 11, quantity: 5, book: { price: 999000, is_active: false } }, // sách bị ẩn
      ],
    });

    const cart = await getCart(1);

    expect(cart.subtotal).toBe(200000); // chỉ 2 × 100k, bỏ qua dòng inactive
    expect(cart.items).toHaveLength(2); // nhưng dòng vẫn trả về để FE hiện cảnh báo
  });
});

describe('addItem — cộng dồn ATOMIC + chặn vượt tồn', () => {
  it('cộng dồn bằng increment (atomic ở DB), không đọc-rồi-ghi → không mất lượt khi chạy song song', async () => {
    mockBookFindUnique.mockResolvedValue(sachConBan);
    // upsert trả về tổng SAU increment (giả lập DB đã cộng: 2 + 3 = 5)
    mockItemUpsert.mockResolvedValue({ id: 99, quantity: 5 });

    await addItem(1, 10, 3);

    // Update branch phải dùng { increment } — đây là điểm chống race condition
    expect(mockItemUpsert.mock.calls[0][0].update.quantity).toEqual({ increment: 3 });
    expect(mockItemUpsert.mock.calls[0][0].create.quantity).toBe(3);
    // KHÔNG được đọc quantity trước rồi tự cộng (cách cũ gây mất lượt khi 2 request song song)
    expect(mockItemFindUnique).not.toHaveBeenCalled();
  });

  it('ném 400 khi tổng sau increment vượt tồn kho (transaction rollback)', async () => {
    mockBookFindUnique.mockResolvedValue({ ...sachConBan, stock_quantity: 4 });
    mockItemUpsert.mockResolvedValue({ id: 99, quantity: 5 }); // tổng sau cộng = 5 > 4

    // upsert được gọi (trong transaction) rồi check vượt tồn → throw → DB thật sẽ rollback
    await expect(addItem(1, 10, 3)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('ném 400 khi sách không tồn tại hoặc đã bị ẩn', async () => {
    mockBookFindUnique.mockResolvedValue({ ...sachConBan, is_active: false });

    await expect(addItem(1, 10, 1)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockItemUpsert).not.toHaveBeenCalled();
  });

  it('ném 400 khi sách hết hàng (stock 0)', async () => {
    mockBookFindUnique.mockResolvedValue({ ...sachConBan, stock_quantity: 0 });
    mockItemUpsert.mockResolvedValue({ id: 99, quantity: 1 });

    await expect(addItem(1, 10, 1)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('updateItem — đặt số lượng tuyệt đối', () => {
  it('ném 404 khi sách không có trong giỏ', async () => {
    mockCartFindUnique.mockResolvedValue({ id: 7 });
    mockItemFindUnique.mockResolvedValue(null);

    await expect(updateItem(1, 10, 3)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('ném 400 khi số lượng mới vượt tồn', async () => {
    mockCartFindUnique.mockResolvedValue({ id: 7 });
    mockItemFindUnique.mockResolvedValue({ id: 99, quantity: 1 });
    mockBookFindUnique.mockResolvedValue({ ...sachConBan, stock_quantity: 2 });

    await expect(updateItem(1, 10, 3)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockItemUpdate).not.toHaveBeenCalled();
  });
});

describe('mergeGuestCart — max(qty), idempotent, không bao giờ ném lỗi nghiệp vụ', () => {
  // Helper dựng mock cho 1 lần merge: dbLines = dòng sẵn trong DB cart, books = sách còn bán
  function setupMerge(dbLines: Array<{ book_id: number; quantity: number }>, books: Array<{ id: number; stock_quantity: number }>) {
    mockItemFindMany.mockResolvedValue(dbLines);
    mockBookFindMany.mockResolvedValue(books);
    // getCart cuối hàm trả giỏ sau merge — nội dung không quan trọng với các test này
    mockCartFindUnique.mockResolvedValue(null);
  }

  it('guest 3 / db 5 → giữ 5; guest 7 / db 2 → lấy 7 (max hai chiều)', async () => {
    setupMerge(
      [
        { book_id: 10, quantity: 5 },
        { book_id: 11, quantity: 2 },
      ],
      [
        { id: 10, stock_quantity: 20 },
        { id: 11, stock_quantity: 20 },
      ],
    );

    await mergeGuestCart(1, {
      items: [
        { book_id: 10, quantity: 3 },
        { book_id: 11, quantity: 7 },
      ],
    });

    const quantities = mockItemUpsert.mock.calls.map((c) => [c[0].create.book_id, c[0].create.quantity]);
    expect(quantities).toEqual([
      [10, 5], // max(3, 5)
      [11, 7], // max(7, 2)
    ]);
  });

  it('sách chỉ có ở guest cart → tạo dòng mới; dòng chỉ có ở DB → không bị đụng tới', async () => {
    setupMerge([{ book_id: 50, quantity: 4 }], [{ id: 10, stock_quantity: 20 }]);

    await mergeGuestCart(1, { items: [{ book_id: 10, quantity: 2 }] });

    // Chỉ 1 upsert cho sách 10 của guest; sách 50 của DB không có lệnh ghi nào
    expect(mockItemUpsert).toHaveBeenCalledTimes(1);
    expect(mockItemUpsert.mock.calls[0][0].create).toMatchObject({ book_id: 10, quantity: 2 });
  });

  it('sách bị ẩn/xóa trong lúc nằm ở guest cart → bỏ qua êm, không ném lỗi', async () => {
    setupMerge([], [{ id: 10, stock_quantity: 20 }]); // sách 999 không có trong danh sách còn bán

    await mergeGuestCart(1, {
      items: [
        { book_id: 10, quantity: 1 },
        { book_id: 999, quantity: 5 },
      ],
    });

    expect(mockItemUpsert).toHaveBeenCalledTimes(1); // chỉ sách 10
  });

  it('vượt tồn kho → clamp xuống mức còn lại thay vì lỗi (guest 10, stock 4 → 4)', async () => {
    setupMerge([], [{ id: 10, stock_quantity: 4 }]);

    await mergeGuestCart(1, { items: [{ book_id: 10, quantity: 10 }] });

    expect(mockItemUpsert.mock.calls[0][0].create.quantity).toBe(4);
  });

  it('sách hết hàng (stock 0) → bỏ qua, không tạo dòng quantity 0', async () => {
    setupMerge([], [{ id: 10, stock_quantity: 0 }]);

    await mergeGuestCart(1, { items: [{ book_id: 10, quantity: 3 }] });

    expect(mockItemUpsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled(); // không có gì để ghi
  });

  it('chạy lại merge lần 2 với cùng guest cart → kết quả không đổi (idempotent)', async () => {
    // Lần 2: DB đã có quantity 5 từ lần merge trước, guest vẫn gửi 5
    setupMerge([{ book_id: 10, quantity: 5 }], [{ id: 10, stock_quantity: 20 }]);

    await mergeGuestCart(1, { items: [{ book_id: 10, quantity: 5 }] });

    // max(5, 5) = 5 — nếu logic là CỘNG thì đã thành 10 (sai)
    expect(mockItemUpsert.mock.calls[0][0].create.quantity).toBe(5);
  });

  it('guest cart rỗng → không ghi gì, chỉ trả giỏ hiện tại', async () => {
    mockCartFindUnique.mockResolvedValue(null);

    const cart = await mergeGuestCart(1, { items: [] });

    expect(mockCartUpsert).not.toHaveBeenCalled();
    expect(cart).toEqual({ items: [], subtotal: 0 });
  });

  it('payload bị sửa tay có book_id TRÙNG → normalize lấy max trước khi upsert (không phụ thuộc thứ tự)', async () => {
    setupMerge([], [{ id: 10, stock_quantity: 20 }]);

    // localStorage sửa tay: 2 dòng cùng sách 10, thứ tự 5 rồi 3
    await mergeGuestCart(1, {
      items: [
        { book_id: 10, quantity: 5 },
        { book_id: 10, quantity: 3 },
      ],
    });

    // Chỉ 1 upsert (đã gom), quantity = max(5, 3) = 5 — nếu loop thẳng có thể ra 3 (sai)
    expect(mockItemUpsert).toHaveBeenCalledTimes(1);
    expect(mockItemUpsert.mock.calls[0][0].create.quantity).toBe(5);
  });

  it('payload trùng book_id + tồn kho thấp → normalize max rồi mới clamp (max 8, stock 4 → 4)', async () => {
    setupMerge([], [{ id: 10, stock_quantity: 4 }]);

    await mergeGuestCart(1, {
      items: [
        { book_id: 10, quantity: 8 },
        { book_id: 10, quantity: 2 },
      ],
    });

    expect(mockItemUpsert.mock.calls[0][0].create.quantity).toBe(4); // min(max(8,2), stock 4)
  });
});
