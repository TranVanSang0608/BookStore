import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchDashboard } from '../../api/dashboard'
import { formatPrice } from '../../lib/format'
import { ORDER_STATUS_META } from '../../lib/order-status'

// Màu cho biểu đồ tròn theo từng trạng thái đơn (DaisyUI dùng class nên ở đây tự khai mã màu)
const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#3b82f6',
  Shipping: '#8b5cf6',
  Delivered: '#22c55e',
  Cancelled: '#9ca3af',
}

export default function AdminDashboardPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchDashboard,
  })

  if (isPending) return <span className="loading loading-spinner" />
  if (isError || !data) return <p className="text-error">Không tải được số liệu tổng quan</p>

  const { kpi, revenueByMonth, topBooks, ordersByStatus } = data

  // Tính sẵn dữ liệu biểu đồ tròn: gắn nhãn tiếng Việt + màu cho từng lát
  // (làm ở đây thay vì trong prop label của Recharts để tránh vướng kiểu của thư viện)
  const pieData = ordersByStatus.map((s) => ({
    label: ORDER_STATUS_META[s.status]?.label ?? s.status,
    count: s.count,
    color: STATUS_COLORS[s.status] ?? '#9ca3af',
  }))

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-semibold text-base-content">Tổng quan</h1>

      {/* 4 thẻ KPI */}
      <div className="stats stats-vertical sm:stats-horizontal border border-base-300 w-full">
        <div className="stat">
          <div className="stat-title">Doanh thu (đã giao)</div>
          <div className="stat-value text-success text-2xl">{formatPrice(kpi.revenue)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Tổng đơn hàng</div>
          <div className="stat-value text-2xl">{kpi.totalOrders}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Đơn cần xử lý</div>
          <div className="stat-value text-warning text-2xl">{kpi.pendingOrders}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Tổng người dùng</div>
          <div className="stat-value text-2xl">{kpi.totalUsers}</div>
        </div>
      </div>

      {/* Doanh thu theo tháng */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h2 className="card-title font-serif text-lg">Doanh thu theo tháng</h2>
          {revenueByMonth.every((m) => m.revenue === 0) ? (
            <p className="text-base-content/60 py-8 text-center">Chưa có đơn đã giao nào</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `${(Number(v) / 1000).toLocaleString('vi-VN')}k`} width={60} />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3e5a39" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top sách bán chạy */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title font-serif text-lg">Top sách bán chạy</h2>
            {topBooks.length === 0 ? (
              <p className="text-base-content/60 py-8 text-center">Chưa có dữ liệu bán hàng</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topBooks} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${Number(v)} cuốn`} />
                  <Bar dataKey="sold" name="Đã bán" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Đơn theo trạng thái */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title font-serif text-lg">Đơn theo trạng thái</h2>
            {ordersByStatus.length === 0 ? (
              <p className="text-base-content/60 py-8 text-center">Chưa có đơn hàng nào</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="count" nameKey="label" label>
                    {pieData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v)} đơn`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
