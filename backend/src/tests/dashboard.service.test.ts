// Unit test cho dashboard service (D61) — mock Prisma, kiểm tra hình dạng dữ liệu trả về
// + việc đổi BigInt (doanh thu theo tháng) sang number để JSON serialize được.
import { getDashboard } from '../modules/dashboard/service';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

const mockOrderAggregate = prisma.order.aggregate as unknown as jest.Mock;
const mockOrderCount = prisma.order.count as unknown as jest.Mock;
const mockOrderGroupBy = prisma.order.groupBy as unknown as jest.Mock;
const mockOrderItemGroupBy = prisma.orderItem.groupBy as unknown as jest.Mock;
const mockUserCount = prisma.user.count as unknown as jest.Mock;
const mockQueryRaw = prisma.$queryRaw as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDashboard', () => {
  // Tháng theo đúng cách service tự dựng bucket ('YYYY-MM' theo giờ máy)
  function monthKey(offset: number): string {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  it('gộp KPI + chart đúng hình dạng, đổi BigInt doanh thu sang number', async () => {
    const curMonth = monthKey(0);
    const prevMonth = monthKey(1);
    mockOrderAggregate.mockResolvedValue({ _sum: { total: 1_500_000 } });
    // order.count gọi 2 lần: tổng đơn, rồi đơn chờ xử lý
    mockOrderCount.mockResolvedValueOnce(42).mockResolvedValueOnce(7);
    mockUserCount.mockResolvedValue(15);
    // Query chỉ trả 2 tháng có dữ liệu — service phải fill thành đủ 12 bucket
    mockQueryRaw.mockResolvedValue([
      { month: prevMonth, revenue: 500000n },
      { month: curMonth, revenue: 1000000n },
    ]);
    mockOrderItemGroupBy.mockResolvedValue([
      { book_title: 'Sách A', _sum: { quantity: 30 } },
      { book_title: 'Sách B', _sum: { quantity: 12 } },
    ]);
    mockOrderGroupBy.mockResolvedValue([
      { status: 'Delivered', _count: { _all: 20 } },
      { status: 'Pending', _count: { _all: 5 } },
    ]);

    const result = await getDashboard();

    expect(result.kpi).toEqual({
      revenue: 1_500_000,
      totalOrders: 42,
      pendingOrders: 7,
      totalUsers: 15,
    });
    // Đủ 12 bucket liên tục, tháng cuối là tháng hiện tại; BigInt đã thành number
    expect(result.revenueByMonth).toHaveLength(12);
    expect(result.revenueByMonth[11]).toEqual({ month: curMonth, revenue: 1000000 });
    expect(result.revenueByMonth[10]).toEqual({ month: prevMonth, revenue: 500000 });
    expect(result.revenueByMonth[0].revenue).toBe(0); // tháng không có dữ liệu = 0
    result.revenueByMonth.forEach((b) => expect(typeof b.revenue).toBe('number'));

    // Top sách CHỈ tính đơn Delivered (nhất quán với doanh thu KPI)
    expect(mockOrderItemGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { order: { status: 'Delivered' } } }),
    );
    expect(result.topBooks).toEqual([
      { title: 'Sách A', sold: 30 },
      { title: 'Sách B', sold: 12 },
    ]);
    expect(result.ordersByStatus).toEqual([
      { status: 'Delivered', count: 20 },
      { status: 'Pending', count: 5 },
    ]);
  });

  it('doanh thu = 0 + đủ 12 bucket rỗng khi chưa có đơn Delivered nào', async () => {
    mockOrderAggregate.mockResolvedValue({ _sum: { total: null } });
    mockOrderCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(1);
    mockQueryRaw.mockResolvedValue([]);
    mockOrderItemGroupBy.mockResolvedValue([]);
    mockOrderGroupBy.mockResolvedValue([]);

    const result = await getDashboard();

    expect(result.kpi.revenue).toBe(0);
    expect(result.revenueByMonth).toHaveLength(12);
    expect(result.revenueByMonth.every((b) => b.revenue === 0)).toBe(true);
    expect(result.topBooks).toEqual([]);
  });
});
