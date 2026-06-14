// Unit test cho payment service — mock Prisma + lib/vnpay. Trọng tâm: đối soát callback
// (idempotent, đối chiếu số tiền từ DB) và khởi tạo URL thanh toán (ownership + trạng thái).
import { prisma } from '../lib/prisma';
import { buildPaymentUrl } from '../lib/vnpay';
import { reconcileVnpayPayment, startVnpayPayment } from '../modules/payment/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    order: { findFirst: jest.fn() },
    payment: { findUnique: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    // $transaction callback (tạo Payment retry có khóa Order); $queryRaw cho FOR UPDATE
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    $queryRaw: jest.fn(),
  },
}));
jest.mock('../lib/vnpay', () => ({ buildPaymentUrl: jest.fn(() => 'https://sandbox.vnpayment.vn/pay?fake=1') }));

const mockOrderFindFirst = prisma.order.findFirst as jest.Mock;
const mockPaymentFindUnique = prisma.payment.findUnique as jest.Mock;
const mockPaymentFindFirst = prisma.payment.findFirst as jest.Mock;
const mockPaymentUpdateMany = prisma.payment.updateMany as jest.Mock;
const mockPaymentCreate = prisma.payment.create as jest.Mock;
const mockBuildUrl = buildPaymentUrl as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPaymentUpdateMany.mockResolvedValue({ count: 1 }); // mặc định: lật trạng thái thành công
});

// Callback VNPay thành công cho đơn 240.000đ (×100 = 24000000)
function okCallback(overrides: Record<string, string> = {}) {
  return {
    vnp_TxnRef: 'REF1',
    vnp_Amount: '24000000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    ...overrides,
  };
}

const paymentRow = { status: 'Pending', amount: 240000, order: { order_code: 'BK-X' } };

describe('reconcileVnpayPayment', () => {
  it('thành công (code 00 + amount khớp) → lật Payment sang Paid (conditional Pending)', async () => {
    mockPaymentFindUnique.mockResolvedValue(paymentRow);

    const res = await reconcileVnpayPayment(okCallback());

    expect(res).toEqual({ result: 'success', orderCode: 'BK-X' });
    // Update CÓ ĐIỀU KIỆN status:'Pending' → idempotent
    expect(mockPaymentUpdateMany.mock.calls[0][0]).toMatchObject({
      where: { txn_ref: 'REF1', status: 'Pending' },
      data: { status: 'Paid' },
    });
  });

  it('đã Paid rồi → noop (Return + IPN gọi chồng cũng không lật 2 lần)', async () => {
    mockPaymentFindUnique.mockResolvedValue({ ...paymentRow, status: 'Paid' });

    const res = await reconcileVnpayPayment(okCallback());

    expect(res.result).toBe('already_paid');
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });

  it('số tiền không khớp DB → invalid_amount, KHÔNG cập nhật (chống sửa amount)', async () => {
    mockPaymentFindUnique.mockResolvedValue(paymentRow);

    const res = await reconcileVnpayPayment(okCallback({ vnp_Amount: '100' }));

    expect(res.result).toBe('invalid_amount');
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });

  it('không tìm thấy txn_ref → not_found', async () => {
    mockPaymentFindUnique.mockResolvedValue(null);

    const res = await reconcileVnpayPayment(okCallback());

    expect(res).toEqual({ result: 'not_found', orderCode: null });
  });

  it('VNPay báo thất bại (code khác 00) → đánh dấu Failed', async () => {
    mockPaymentFindUnique.mockResolvedValue(paymentRow);

    const res = await reconcileVnpayPayment(okCallback({ vnp_ResponseCode: '24' })); // 24 = user hủy

    expect(res.result).toBe('failed');
    expect(mockPaymentUpdateMany.mock.calls[0][0].data.status).toBe('Failed');
  });

  it('race: lúc ký lật Paid nhưng count=0 (status vừa đổi) → KHÔNG báo success giả', async () => {
    // Đọc đầu thấy Pending, nhưng updateMany count=0 (đã bị Cancelled xen vào) → re-read
    mockPaymentFindUnique
      .mockResolvedValueOnce(paymentRow) // đọc đầu: Pending
      .mockResolvedValueOnce({ status: 'Cancelled' }); // re-read: không phải Paid
    mockPaymentUpdateMany.mockResolvedValue({ count: 0 });

    const res = await reconcileVnpayPayment(okCallback());

    expect(res.result).toBe('failed'); // KHÔNG phải 'success'
  });
});

describe('startVnpayPayment', () => {
  it('đơn không tồn tại / không thuộc user → 404', async () => {
    mockOrderFindFirst.mockResolvedValue(null);

    await expect(startVnpayPayment(1, 'BK-X', '127.0.0.1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('đơn COD (đã có Payment cod) → 400, KHÔNG cho thanh toán VNPay', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 1,
      status: 'Pending',
      total: 240000,
      payments: [{ gateway: 'cod', status: 'Pending' }],
    });

    await expect(startVnpayPayment(1, 'BK-X', '127.0.0.1')).rejects.toMatchObject({ statusCode: 400 });
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it('đơn không còn Pending → 400', async () => {
    mockOrderFindFirst.mockResolvedValue({ id: 1, status: 'Confirmed', total: 240000, payments: [] });

    await expect(startVnpayPayment(1, 'BK-X', '127.0.0.1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('đơn đã có Payment Paid → 400 (không trả tiền 2 lần)', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 1,
      status: 'Pending',
      total: 240000,
      payments: [{ gateway: 'vnpay', status: 'Paid', txn_ref: 'R' }],
    });

    await expect(startVnpayPayment(1, 'BK-X', '127.0.0.1')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('dùng lại Payment vnpay Pending sẵn có → build URL từ txn_ref đó', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 1,
      order_code: 'BK-X',
      status: 'Pending',
      total: 240000,
      payments: [{ gateway: 'vnpay', status: 'Pending', txn_ref: 'REF-EXISTING', amount: 240000 }],
    });

    const res = await startVnpayPayment(1, 'BK-X', '127.0.0.1');

    expect(mockPaymentCreate).not.toHaveBeenCalled(); // không tạo mới
    expect(mockBuildUrl.mock.calls[0][0]).toMatchObject({ txnRef: 'REF-EXISTING', amount: 240000 });
    expect(res.payment_url).toContain('sandbox.vnpayment.vn');
  });

  it('lần trước Failed (không còn Pending) → tạo Payment vnpay MỚI để thử lại', async () => {
    mockOrderFindFirst.mockResolvedValue({
      id: 1,
      order_code: 'BK-X',
      status: 'Pending',
      total: 240000,
      payments: [{ gateway: 'vnpay', status: 'Failed', txn_ref: 'OLD' }],
    });
    mockPaymentFindFirst.mockResolvedValue(null); // trong transaction: chưa có Pending nào → tạo mới
    mockPaymentCreate.mockResolvedValue({ txn_ref: 'REF-NEW', amount: 240000 });

    await startVnpayPayment(1, 'BK-X', '127.0.0.1');

    expect(mockPaymentCreate).toHaveBeenCalled();
    expect(mockPaymentCreate.mock.calls[0][0].data).toMatchObject({ gateway: 'vnpay', status: 'Pending' });
    expect(mockBuildUrl.mock.calls[0][0].txnRef).toBe('REF-NEW');
  });
});
