import { prisma } from '../../lib/prisma';

// Số liệu tổng quan cho trang admin (D61). Tất cả là truy vấn ĐỌC, không transaction.
// Data đồ án nhỏ → tính trực tiếp mỗi lần gọi, không cần bảng thống kê tính sẵn/cron.

// 1 dòng doanh thu theo tháng (từ $queryRaw bên dưới)
interface RevenueRow {
  month: string; // 'YYYY-MM'
  revenue: bigint; // SUM(total) Postgres trả về dạng bigint
}

export async function getDashboard() {
  const DELIVERED = 'Delivered';

  // --- KPI: 4 con số tổng quan ---
  // Doanh thu chỉ tính đơn ĐÃ GIAO (Delivered) — đơn chưa giao/đã hủy chưa phải tiền thật.
  const [revenueAgg, totalOrders, pendingOrders, totalUsers] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: { status: DELIVERED } }),
    prisma.order.count(),
    // "Đơn cần xử lý" = đang chờ admin thao tác (Pending hoặc Confirmed)
    prisma.order.count({ where: { status: { in: ['Pending', 'Confirmed'] } } }),
    prisma.user.count(),
  ]);

  // --- Doanh thu 12 tháng gần nhất ---
  // Dùng $queryRaw vì Prisma groupBy KHÔNG cắt được ngày theo tháng (date_trunc).
  // date_trunc('month', placed_at) gom mọi đơn cùng tháng về một mốc; chỉ lấy đơn Delivered.
  const revenueByMonthRaw = await prisma.$queryRaw<RevenueRow[]>`
    SELECT to_char(date_trunc('month', placed_at), 'YYYY-MM') AS month,
           SUM(total)::bigint AS revenue
    FROM "Order"
    WHERE status = 'Delivered'
      AND placed_at >= date_trunc('month', now()) - interval '11 months'
    GROUP BY 1
  `;
  // Query chỉ trả những tháng CÓ đơn. Tự dựng đủ 12 bucket (tháng không có doanh thu = 0)
  // để biểu đồ là chuỗi liên tục, không nhảy tháng. BigInt → number để JSON serialize được.
  const revenueMap = new Map(revenueByMonthRaw.map((r) => [r.month, Number(r.revenue)]));
  const now = new Date();
  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    revenueByMonth.push({ month, revenue: revenueMap.get(month) ?? 0 });
  }

  // --- Top 5 sách bán chạy ---
  // "Bán chạy" = đã thực sự bán được → chỉ tính đơn Delivered (NHẤT QUÁN với doanh thu KPI:
  // Pending/Confirmed/Shipping chưa chắc thành đơn). Gom theo book_title SNAPSHOT trong OrderItem
  // → có sẵn tên để hiển thị, khỏi join Book (đúng tinh thần snapshot D25). _sum.quantity = số cuốn đã bán.
  const topBooksRaw = await prisma.orderItem.groupBy({
    by: ['book_title'],
    where: { order: { status: 'Delivered' } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });
  const topBooks = topBooksRaw.map((b) => ({
    title: b.book_title,
    sold: b._sum.quantity ?? 0,
  }));

  // --- Đếm đơn theo từng trạng thái (cho biểu đồ tròn) ---
  const byStatusRaw = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
  const ordersByStatus = byStatusRaw.map((s) => ({
    status: s.status,
    count: s._count._all,
  }));

  return {
    kpi: {
      revenue: revenueAgg._sum.total ?? 0,
      totalOrders,
      pendingOrders,
      totalUsers,
    },
    revenueByMonth,
    topBooks,
    ordersByStatus,
  };
}
