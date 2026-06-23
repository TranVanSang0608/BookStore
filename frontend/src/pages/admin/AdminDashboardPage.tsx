import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
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
import { useThemeColors, type ThemeColors } from '../../hooks/useThemeColors'
import { formatPrice } from '../../lib/format'
import { ORDER_STATUS_META } from '../../lib/order-status'

// Mỗi trạng thái đơn ánh xạ tới 1 token màu DaisyUI (tự đổi theo theme) thay vì mã hex cứng.
const STATUS_TOKEN: Record<string, keyof ThemeColors> = {
  Pending: 'warning',
  Confirmed: 'info',
  Shipping: 'secondary',
  Delivered: 'success',
  Cancelled: 'neutral',
}

// Bảng số liệu kèm theo biểu đồ — gập lại mặc định. Giúp người dùng đọc số chính xác VÀ
// người dùng trình đọc màn hình (không "thấy" được chart) vẫn nắm được dữ liệu (a11y).
function DataTable({ caption, head, rows }: { caption: string; head: [string, string]; rows: [string, ReactNode][] }) {
  return (
    <details className="mt-3">
      <summary className="text-sm text-base-content/70 cursor-pointer">Xem số liệu dạng bảng</summary>
      <table className="table table-sm mt-2">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th>{head[0]}</th>
            <th className="text-right">{head[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td className="text-right">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export default function AdminDashboardPage() {
  const c = useThemeColors()
  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchDashboard,
  })

  if (isPending) return <span className="loading loading-spinner" />
  if (isError || !data) return <p className="text-error">Không tải được số liệu tổng quan</p>

  const { kpi, revenueByMonth, topBooks, ordersByStatus } = data

  // Gắn nhãn tiếng Việt + màu theme cho từng lát bánh
  const pieData = ordersByStatus.map((s) => ({
    label: ORDER_STATUS_META[s.status]?.label ?? s.status,
    count: s.count,
    color: c[STATUS_TOKEN[s.status] ?? 'neutral'],
  }))

  // Style dùng chung cho trục/lưới/tooltip để biểu đồ đọc rõ ở CẢ theme sáng lẫn tối
  const axisTick = { fill: c.baseContent, fontSize: 12 }
  // Tooltip là div HTML thường nên dùng được var() — nền/viền/chữ theo theme, hết "hộp trắng" trên nền tối
  const tooltipStyle = {
    contentStyle: { background: 'var(--color-base-100)', border: `1px solid ${c.base300}`, borderRadius: 8, color: c.baseContent },
    labelStyle: { color: c.baseContent },
    itemStyle: { color: c.baseContent },
  }
  const hasRevenue = !revenueByMonth.every((m) => m.revenue === 0)

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
          {!hasRevenue ? (
            <p className="text-base-content/70 py-8 text-center">Chưa có đơn đã giao nào</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.base300} />
                  <XAxis dataKey="month" tick={axisTick} stroke={c.base300} />
                  <YAxis
                    tickFormatter={(v) => `${(Number(v) / 1000).toLocaleString('vi-VN')}k`}
                    width={60}
                    tick={axisTick}
                    stroke={c.base300}
                  />
                  <Tooltip formatter={(v) => formatPrice(Number(v))} {...tooltipStyle} />
                  <Bar dataKey="revenue" name="Doanh thu" fill={c.primary} />
                </BarChart>
              </ResponsiveContainer>
              <DataTable
                caption="Doanh thu theo từng tháng"
                head={['Tháng', 'Doanh thu']}
                rows={revenueByMonth.map((m) => [m.month, formatPrice(m.revenue)])}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top sách bán chạy */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title font-serif text-lg">Top sách bán chạy</h2>
            {topBooks.length === 0 ? (
              <p className="text-base-content/70 py-8 text-center">Chưa có dữ liệu bán hàng</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topBooks} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={c.base300} />
                    <XAxis type="number" allowDecimals={false} tick={axisTick} stroke={c.base300} />
                    <YAxis type="category" dataKey="title" width={120} tick={{ ...axisTick }} stroke={c.base300} />
                    <Tooltip formatter={(v) => `${Number(v)} cuốn`} {...tooltipStyle} />
                    <Bar dataKey="sold" name="Đã bán" fill={c.accent} />
                  </BarChart>
                </ResponsiveContainer>
                <DataTable
                  caption="Số lượng đã bán theo sách"
                  head={['Sách', 'Đã bán']}
                  rows={topBooks.map((b) => [b.title, `${b.sold} cuốn`])}
                />
              </>
            )}
          </div>
        </div>

        {/* Đơn theo trạng thái */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title font-serif text-lg">Đơn theo trạng thái</h2>
            {ordersByStatus.length === 0 ? (
              <p className="text-base-content/70 py-8 text-center">Chưa có đơn hàng nào</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="label" label>
                      {pieData.map((entry) => (
                        <Cell key={entry.label} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${Number(v)} đơn`} {...tooltipStyle} />
                    <Legend formatter={(value) => <span style={{ color: c.baseContent }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <DataTable
                  caption="Số đơn theo trạng thái"
                  head={['Trạng thái', 'Số đơn']}
                  rows={pieData.map((p) => [p.label, `${p.count} đơn`])}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
