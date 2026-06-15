// Unit test cho order service — mock Prisma + cart/shipping service.
// Trọng tâm: transaction tạo đơn (snapshot, trừ kho atomic, oversell rollback),
// hủy đơn (hoàn kho, idempotent) và state machine đổi trạng thái (D42/D45).
import { prisma } from '../lib/prisma';
import { getCart } from '../modules/cart/service';
import {
  adminUpdateStatus,
  cancelOrder,
  createOrder,
} from '../modules/order/service';
import { calcShippingFee } from '../modules/shipping/service';
import { validateVoucher } from '../modules/voucher/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    address: { findFirst: jest.fn() },
    order: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    orderItem: { createMany: jest.fn() },
    book: { updateMany: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn(), updateMany: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    voucher: { updateMany: jest.fn(), update: jest.fn() },
    voucherUsage: { create: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
    // $transaction callback: gọi callback với chính prisma mock (đóng vai tx)
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
    ),
  },
}));

// Mock cart + shipping + voucher service để cô lập logic order
jest.mock('../modules/cart/service', () => ({ getCart: jest.fn() }));
jest.mock('../modules/shipping/service', () => ({ calcShippingFee: jest.fn() }));
jest.mock('../modules/voucher/service', () => ({ validateVoucher: jest.fn() }));

const mockGetCart = getCart as jest.Mock;
const mockCalcShip = calcShippingFee as jest.Mock;
const mockAddressFindFirst = prisma.address.findFirst as jest.Mock;
const mockOrderCreate = prisma.order.create as jest.Mock;
const mockOrderFindUnique = prisma.order.findUnique as jest.Mock;
const mockOrderUpdateMany = prisma.order.updateMany as jest.Mock;
const mockItemCreateMany = prisma.orderItem.createMany as jest.Mock;
const mockBookUpdateMany = prisma.book.updateMany as jest.Mock;
const mockBookUpdate = prisma.book.update as jest.Mock;
const mockPaymentCreate = prisma.payment.create as jest.Mock;
const mockPaymentUpdateMany = prisma.payment.updateMany as jest.Mock;
const mockCartDeleteMany = prisma.cartItem.deleteMany as jest.Mock;
const mock$transaction = prisma.$transaction as jest.Mock;
const mockValidateVoucher = validateVoucher as jest.Mock;
const mockVoucherUpdateMany = prisma.voucher.updateMany as jest.Mock;
const mockVoucherUpdate = prisma.voucher.update as jest.Mock;
const mockVoucherUsageCreate = prisma.voucherUsage.create as jest.Mock;
const mockVoucherUsageDeleteMany = prisma.voucherUsage.deleteMany as jest.Mock;
const mockVoucherUsageCount = prisma.voucherUsage.count as jest.Mock;

// Sách mẫu trong giỏ: 2 cuốn "Mắt Biếc" giá 100k, còn 5 cuốn
function cartWith(overrides: Partial<{ quantity: number; is_active: boolean; stock: number; price: number }> = {}) {
  const { quantity = 2, is_active = true, stock = 5, price = 100000 } = overrides;
  return {
    items: [
      {
        book_id: 10,
        quantity,
        book: {
          id: 10,
          title: 'Mắt Biếc',
          price,
          stock_quantity: stock,
          cover_image_url: 'http://img/mb.jpg',
          is_active,
          author: { id: 1, name: 'Nguyễn Nhật Ánh' },
        },
      },
    ],
    subtotal: quantity * price,
  };
}

const diaChi = {
  id: 7,
  user_id: 1,
  recipient_name: 'Nguyễn Văn A',
  phone: '0912345678',
  province_code: '01',
  province_name: 'Thành phố Hà Nội',
  ward_name: 'Phường Ba Đình',
  street_detail: '12 Phố Huế',
};

beforeEach(() => {
  jest.clearAllMocks();
  // Mặc định: các bước trong transaction tạo đơn đều thành công
  mockOrderCreate.mockResolvedValue({ id: 100, order_code: 'BK-X' });
  mockItemCreateMany.mockResolvedValue({ count: 1 });
  mockBookUpdateMany.mockResolvedValue({ count: 1 });
  mockPaymentCreate.mockResolvedValue({ id: 1 });
  mockCartDeleteMany.mockResolvedValue({ count: 1 }); // 1 dòng đặt → xóa đúng 1 dòng
  // Re-read cuối transaction (createOrder/cancel/admin đều trả chi tiết đầy đủ)
  mockOrderFindUnique.mockResolvedValue({ id: 100, order_code: 'BK-X', items: [], payments: [] });
  mockOrderUpdateMany.mockResolvedValue({ count: 1 }); // claim đổi trạng thái thành công
  // Voucher (Phase 7): mặc định giữ lượt thành công
  mockVoucherUpdateMany.mockResolvedValue({ count: 1 });
  mockVoucherUpdate.mockResolvedValue({});
  mockVoucherUsageCreate.mockResolvedValue({ id: 1 });
  mockVoucherUsageDeleteMany.mockResolvedValue({ count: 1 });
  mockVoucherUsageCount.mockResolvedValue(0); // user chưa dùng mã (per_user_limit còn chỗ)
});

describe('createOrder — tạo đơn + transaction', () => {
  it('snapshot địa chỉ + dòng hàng, tính tiền server-side, tạo Payment COD, dọn giỏ', async () => {
    mockGetCart.mockResolvedValue(cartWith()); // subtotal 200k
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });

    await createOrder(1, { address_id: 7, payment_method: 'cod' });

    // Ship tính từ province_code của ĐỊA CHỈ + subtotal server-side (không tin client)
    expect(mockCalcShip).toHaveBeenCalledWith('01', 200000);

    // Order snapshot địa chỉ + tổng tiền đúng (200k + 20k)
    const orderData = mockOrderCreate.mock.calls[0][0].data;
    expect(orderData).toMatchObject({
      subtotal: 200000,
      shipping_fee: 20000,
      total: 220000,
      shipping_recipient_name: 'Nguyễn Văn A',
      shipping_province_name: 'Thành phố Hà Nội',
      shipping_street: '12 Phố Huế',
    });

    // OrderItem snapshot title/tác giả/giá/bìa tại thời điểm đặt
    const itemData = mockItemCreateMany.mock.calls[0][0].data[0];
    expect(itemData).toMatchObject({
      book_id: 10,
      book_title: 'Mắt Biếc',
      book_author_name: 'Nguyễn Nhật Ánh',
      price_at_order: 100000,
      cover_image_url_snapshot: 'http://img/mb.jpg',
      quantity: 2,
    });

    // Payment COD Pending, amount = total, KHÔNG có txn_ref (COD không qua cổng)
    expect(mockPaymentCreate.mock.calls[0][0].data).toMatchObject({ gateway: 'cod', amount: 220000, status: 'Pending' });
    expect(mockPaymentCreate.mock.calls[0][0].data.txn_ref).toBeNull();
    // Giỏ được dọn
    expect(mockCartDeleteMany).toHaveBeenCalled();
  });

  it('payment_method vnpay → Payment gateway vnpay + có txn_ref (để đối soát callback)', async () => {
    mockGetCart.mockResolvedValue(cartWith());
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });

    await createOrder(1, { address_id: 7, payment_method: 'vnpay' });

    const data = mockPaymentCreate.mock.calls[0][0].data;
    expect(data.gateway).toBe('vnpay');
    expect(data.status).toBe('Pending');
    expect(data.txn_ref).toBeTruthy(); // có mã giao dịch để đối chiếu khi VNPay callback về
  });

  it('trừ kho ATOMIC bằng updateMany có điều kiện stock >= qty (chống oversell)', async () => {
    mockGetCart.mockResolvedValue(cartWith());
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });

    await createOrder(1, { address_id: 7, payment_method: 'cod' });

    expect(mockBookUpdateMany.mock.calls[0][0]).toEqual({
      where: { id: 10, is_active: true, stock_quantity: { gte: 2 } },
      data: { stock_quantity: { decrement: 2 } },
    });
  });

  it('oversell: updateMany trả count 0 → ném 409 (transaction rollback)', async () => {
    mockGetCart.mockResolvedValue(cartWith());
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });
    mockBookUpdateMany.mockResolvedValue({ count: 0 }); // có đơn khác vừa mua mất cuốn cuối

    await expect(createOrder(1, { address_id: 7, payment_method: 'cod' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('giỏ rỗng → 400, không tạo đơn', async () => {
    mockGetCart.mockResolvedValue({ items: [], subtotal: 0 });

    await expect(createOrder(1, { address_id: 7, payment_method: 'cod' })).rejects.toMatchObject({ statusCode: 400 });
    expect(mockOrderCreate).not.toHaveBeenCalled();
  });

  it('địa chỉ không thuộc về user → 404', async () => {
    mockGetCart.mockResolvedValue(cartWith());
    mockAddressFindFirst.mockResolvedValue(null);

    await expect(createOrder(1, { address_id: 999, payment_method: 'cod' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('sách trong giỏ đã ngừng bán → 400', async () => {
    mockGetCart.mockResolvedValue(cartWith({ is_active: false }));
    mockAddressFindFirst.mockResolvedValue(diaChi);

    await expect(createOrder(1, { address_id: 7, payment_method: 'cod' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('số lượng đặt vượt tồn kho → 400 (chặn trước transaction)', async () => {
    mockGetCart.mockResolvedValue(cartWith({ quantity: 10, stock: 5 }));
    mockAddressFindFirst.mockResolvedValue(diaChi);

    await expect(createOrder(1, { address_id: 7, payment_method: 'cod' })).rejects.toMatchObject({ statusCode: 400 });
    expect(mockOrderCreate).not.toHaveBeenCalled();
  });

  it('trùng mã đơn (P2002) → sinh mã mới và retry, cuối cùng tạo được', async () => {
    mockGetCart.mockResolvedValue(cartWith());
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });
    // Lần 1 transaction ném P2002, lần 2 chạy bình thường
    mock$transaction
      .mockImplementationOnce(async () => {
        throw { code: 'P2002' };
      })
      .mockImplementation(async (arg: unknown) => (arg as (tx: unknown) => unknown)(prisma));

    const order = await createOrder(1, { address_id: 7, payment_method: 'cod' });

    expect(mock$transaction).toHaveBeenCalledTimes(2);
    expect(order).toMatchObject({ id: 100 });
  });

  it('xóa từng dòng theo đúng (book_id + quantity) đã đặt, không xóa cả giỏ', async () => {
    mockGetCart.mockResolvedValue(cartWith());
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });

    await createOrder(1, { address_id: 7, payment_method: 'cod' });

    // Điều kiện xóa gắn cả quantity → tab khác đổi số lượng sẽ không khớp (optimistic lock)
    expect(mockCartDeleteMany.mock.calls[0][0].where).toMatchObject({
      cart: { user_id: 1 },
      book_id: 10,
      quantity: 2,
    });
  });

  it('giỏ đổi giữa chừng (double-submit / đổi qty): dòng không khớp → count thiếu → 409', async () => {
    mockGetCart.mockResolvedValue(cartWith());
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });
    mockCartDeleteMany.mockResolvedValue({ count: 0 }); // dòng đã bị xóa/đổi qty → không khớp

    await expect(createOrder(1, { address_id: 7, payment_method: 'cod' })).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('cancelOrder — hủy + hoàn kho (claim atomic)', () => {
  // Đơn COD chưa thanh toán: payments rỗng/cod-Pending → hủy bình thường
  it('claim đổi Cancelled, hoàn kho từng dòng, hủy Payment đang chờ', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Pending', items: [{ book_id: 10, quantity: 2 }], payments: [] });

    await cancelOrder(100);

    // Claim có điều kiện status để chống race (chỉ đổi nếu vẫn đúng status vừa đọc)
    expect(mockOrderUpdateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 100, status: 'Pending' },
      data: { status: 'Cancelled' },
    });
    expect(mockBookUpdate).toHaveBeenCalledWith({ where: { id: 10 }, data: { stock_quantity: { increment: 2 } } });
    expect(mockPaymentUpdateMany.mock.calls[0][0].data).toMatchObject({ status: 'Cancelled' });
  });

  it('đơn đã Cancelled → noop, KHÔNG claim, KHÔNG hoàn kho (idempotent)', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Cancelled', items: [{ book_id: 10, quantity: 2 }], payments: [] });

    await cancelOrder(100);

    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
    expect(mockBookUpdate).not.toHaveBeenCalled();
  });

  it('đơn đã có Payment Paid (vd VNPay) → 400, KHÔNG hủy/hoàn kho (refund ngoài scope)', async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: 100,
      status: 'Pending',
      items: [{ book_id: 10, quantity: 2 }],
      payments: [{ gateway: 'vnpay', status: 'Paid' }],
    });

    await expect(cancelOrder(100, ['Pending'])).rejects.toMatchObject({ statusCode: 400 });
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
    expect(mockBookUpdate).not.toHaveBeenCalled();
  });

  it('thua race vì đơn đã bị hủy bởi request khác (claim count=0, re-read=Cancelled) → noop 200', async () => {
    mockOrderFindUnique
      .mockResolvedValueOnce({ id: 100, status: 'Pending', items: [{ book_id: 10, quantity: 2 }], payments: [] })
      .mockResolvedValueOnce({ id: 100, status: 'Cancelled', items: [], payments: [] }); // re-read sau count=0
    mockOrderUpdateMany.mockResolvedValue({ count: 0 });

    await cancelOrder(100, ['Pending']); // không throw

    expect(mockBookUpdate).not.toHaveBeenCalled(); // không hoàn kho lần 2
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });

  it('thua race vì đơn vừa chuyển status khác (vd Confirmed) → 409, KHÔNG báo hủy thành công', async () => {
    mockOrderFindUnique
      .mockResolvedValueOnce({ id: 100, status: 'Pending', items: [{ book_id: 10, quantity: 2 }], payments: [] })
      .mockResolvedValueOnce({ id: 100, status: 'Confirmed', items: [], payments: [] }); // admin vừa xác nhận
    mockOrderUpdateMany.mockResolvedValue({ count: 0 });

    await expect(cancelOrder(100, ['Pending'])).rejects.toMatchObject({ statusCode: 409 });
    expect(mockBookUpdate).not.toHaveBeenCalled();
  });

  it('item có book_id = null (sách đã bị xóa) → bỏ qua khi hoàn kho', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Pending', items: [{ book_id: null, quantity: 2 }], payments: [] });

    await cancelOrder(100);

    expect(mockBookUpdate).not.toHaveBeenCalled();
  });

  it('status không nằm trong allowedFrom (vd user hủy đơn đã Confirmed) → 400', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Confirmed', items: [], payments: [] });

    // User chỉ được hủy từ Pending
    await expect(cancelOrder(100, ['Pending'])).rejects.toMatchObject({ statusCode: 400 });
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
  });

  it('đơn đã Shipping → 400 (đã gửi đi, không hủy được)', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Shipping', items: [], payments: [] });

    await expect(cancelOrder(100)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('voucher (Phase 7) — áp khi tạo đơn, hoàn khi hủy', () => {
  const baseInput = { address_id: 7, payment_method: 'cod' as const };

  function setupCart() {
    mockGetCart.mockResolvedValue(cartWith()); // subtotal 200k
    mockAddressFindFirst.mockResolvedValue(diaChi);
    mockCalcShip.mockResolvedValue({ shipping_fee: 20000 });
  }

  it('áp voucher: trừ discount vào total, snapshot code/id, giữ lượt + log VoucherUsage', async () => {
    setupCart();
    mockValidateVoucher.mockResolvedValue({
      voucher: { id: 3, code: 'SALE20K', usage_limit: 100, per_user_limit: 5 },
      discount: 20000,
    });

    await createOrder(1, { ...baseInput, voucher_code: 'SALE20K' });

    const orderData = mockOrderCreate.mock.calls[0][0].data;
    expect(orderData).toMatchObject({
      subtotal: 200000,
      shipping_fee: 20000,
      discount_amount: 20000,
      total: 200000, // 200k + 20k ship - 20k giảm
      voucher_code: 'SALE20K',
      voucher_id: 3,
    });
    // Giữ lượt ATOMIC: updateMany có điều kiện used_count < usage_limit
    expect(mockVoucherUpdateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 3, used_count: { lt: 100 } },
      data: { used_count: { increment: 1 } },
    });
    expect(mockVoucherUsageCreate.mock.calls[0][0].data).toMatchObject({
      voucher_id: 3,
      user_id: 1,
      order_id: 100,
    });
  });

  it('usage_limit null → tăng used_count KHÔNG điều kiện', async () => {
    setupCart();
    mockValidateVoucher.mockResolvedValue({ voucher: { id: 3, code: 'X', usage_limit: null }, discount: 10000 });

    await createOrder(1, { ...baseInput, voucher_code: 'X' });

    expect(mockVoucherUpdateMany.mock.calls[0][0].where).toEqual({ id: 3 });
  });

  it('voucher vừa hết lượt (compare-and-set count=0) → 409 rollback', async () => {
    setupCart();
    mockValidateVoucher.mockResolvedValue({ voucher: { id: 3, code: 'X', usage_limit: 1, per_user_limit: 1 }, discount: 10000 });
    mockVoucherUpdateMany.mockResolvedValue({ count: 0 });

    await expect(createOrder(1, { ...baseInput, voucher_code: 'X' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('per_user_limit dưới race: đếm usage TRONG tx >= limit → 409 (chống double-submit dùng mã 1 lần/user)', async () => {
    setupCart();
    // usage_limit null (lượt tổng không giới hạn) để cô lập đúng nhánh per-user; row lock của
    // updateMany used_count serialize → request sau đếm thấy usage của request thắng
    mockValidateVoucher.mockResolvedValue({
      voucher: { id: 3, code: 'X', usage_limit: null, per_user_limit: 1 },
      discount: 10000,
    });
    mockVoucherUsageCount.mockResolvedValue(1); // request thắng đã ghi 1 usage cho user này

    await expect(createOrder(1, { ...baseInput, voucher_code: 'X' })).rejects.toMatchObject({ statusCode: 409 });
    expect(mockVoucherUsageCreate).not.toHaveBeenCalled(); // không ghi usage thứ 2
  });

  it('không nhập mã → KHÔNG đụng bảng voucher, total không trừ', async () => {
    setupCart();

    await createOrder(1, baseInput);

    expect(mockValidateVoucher).not.toHaveBeenCalled();
    expect(mockVoucherUpdateMany).not.toHaveBeenCalled();
    expect(mockOrderCreate.mock.calls[0][0].data).toMatchObject({ discount_amount: 0, voucher_id: null });
  });

  it('hủy đơn CÓ voucher → hoàn used_count + xóa VoucherUsage', async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: 100,
      status: 'Pending',
      voucher_id: 3,
      items: [{ book_id: 10, quantity: 2 }],
      payments: [],
    });

    await cancelOrder(100);

    expect(mockVoucherUpdateMany).toHaveBeenCalledWith({
      where: { id: 3, used_count: { gt: 0 } },
      data: { used_count: { decrement: 1 } },
    });
    expect(mockVoucherUsageDeleteMany).toHaveBeenCalledWith({ where: { order_id: 100 } });
  });

  it('hủy đơn KHÔNG voucher (voucher_id null) → KHÔNG đụng bảng voucher', async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: 100,
      status: 'Pending',
      voucher_id: null,
      items: [{ book_id: 10, quantity: 2 }],
      payments: [],
    });

    await cancelOrder(100);

    expect(mockVoucherUpdateMany).not.toHaveBeenCalled();
    expect(mockVoucherUsageDeleteMany).not.toHaveBeenCalled();
  });
});

describe('adminUpdateStatus — state machine (D42)', () => {
  // Mặc định đơn COD (payments rỗng) — không bị chặn bởi guard "VNPay chưa thanh toán"
  it('tiến đúng 1 bước Pending → Confirmed: claim có điều kiện status', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Pending', payments: [] });

    await adminUpdateStatus(100, 'Confirmed');

    expect(mockOrderUpdateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 100, status: 'Pending' },
      data: { status: 'Confirmed' },
    });
  });

  it('nhảy bước Pending → Shipping: 400', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Pending', payments: [] });

    await expect(adminUpdateStatus(100, 'Shipping')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lùi bước Confirmed → Pending: 400', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Confirmed', payments: [] });

    await expect(adminUpdateStatus(100, 'Pending')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('đơn VNPay CHƯA thanh toán → KHÔNG cho xác nhận (400)', async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: 100,
      status: 'Pending',
      payments: [{ gateway: 'vnpay', status: 'Pending' }],
    });

    await expect(adminUpdateStatus(100, 'Confirmed')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
  });

  it('đơn VNPay ĐÃ thanh toán → cho xác nhận bình thường', async () => {
    mockOrderFindUnique.mockResolvedValue({
      id: 100,
      status: 'Pending',
      payments: [{ gateway: 'vnpay', status: 'Paid' }],
    });

    await adminUpdateStatus(100, 'Confirmed');

    expect(mockOrderUpdateMany.mock.calls[0][0].data).toEqual({ status: 'Confirmed' });
  });

  it('race: đơn vừa bị Cancelled xen vào (claim count=0) → 409, KHÔNG hồi sinh', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Pending', payments: [] });
    mockOrderUpdateMany.mockResolvedValue({ count: 0 }); // status đã đổi giữa lúc đọc và update

    await expect(adminUpdateStatus(100, 'Confirmed')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('giao thành công (→ Delivered) thì thu tiền COD: Payment → Paid', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Shipping', payments: [] });

    await adminUpdateStatus(100, 'Delivered');

    expect(mockPaymentUpdateMany.mock.calls[0][0].data).toMatchObject({ status: 'Paid' });
  });

  it('hủy đơn đang Shipping: 400 (đã gửi đi, không hủy)', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Shipping', items: [], payments: [] });

    await expect(adminUpdateStatus(100, 'Cancelled')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('hủy đơn Pending → ủy quyền cancelOrder (hoàn kho)', async () => {
    mockOrderFindUnique.mockResolvedValue({ id: 100, status: 'Pending', items: [{ book_id: 10, quantity: 2 }], payments: [] });

    await adminUpdateStatus(100, 'Cancelled');

    expect(mockBookUpdate).toHaveBeenCalledWith({ where: { id: 10 }, data: { stock_quantity: { increment: 2 } } });
  });
});
