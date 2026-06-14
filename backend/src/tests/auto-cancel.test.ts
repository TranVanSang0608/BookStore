// Unit test cho cron auto-hủy đơn Pending quá hạn — trọng tâm: câu where phải BỎ QUA
// đơn đã thanh toán (D49), tránh hủy đơn VNPay đã trả tiền (không hoàn tiền được).
import { cancelStalePendingOrders } from '../jobs/auto-cancel-orders';
import { prisma } from '../lib/prisma';
import { cancelOrder } from '../modules/order/service';

jest.mock('../lib/prisma', () => ({
  prisma: { order: { findMany: jest.fn() } },
}));
jest.mock('../modules/order/service', () => ({ cancelOrder: jest.fn() }));

const mockFindMany = prisma.order.findMany as jest.Mock;
const mockCancelOrder = cancelOrder as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('cancelStalePendingOrders', () => {
  it('chỉ quét đơn Pending quá hạn VÀ chưa có Payment nào Paid', async () => {
    mockFindMany.mockResolvedValue([]);

    await cancelStalePendingOrders();

    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.status).toBe('Pending');
    expect(where.placed_at.lt).toBeInstanceOf(Date);
    // Điều kiện then chốt: loại đơn đã thanh toán (vd VNPay đã Paid nhưng order còn Pending)
    expect(where.payments).toEqual({ none: { status: 'Paid' } });
  });

  it('gọi cancelOrder(["Pending"]) cho từng đơn quá hạn', async () => {
    mockFindMany.mockResolvedValue([
      { id: 1, order_code: 'BK-A' },
      { id: 2, order_code: 'BK-B' },
    ]);

    await cancelStalePendingOrders();

    expect(mockCancelOrder).toHaveBeenCalledTimes(2);
    expect(mockCancelOrder).toHaveBeenCalledWith(1, ['Pending']);
    expect(mockCancelOrder).toHaveBeenCalledWith(2, ['Pending']);
  });
});
