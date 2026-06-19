import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminOrders, type OrderStatus } from '../../api/orders'
import Pagination from '../../features/catalog/Pagination'
import { formatDateTime, formatPrice } from '../../lib/format'
import { ORDER_STATUS_META } from '../../lib/order-status'

const STATUS_OPTIONS: OrderStatus[] = ['Pending', 'Confirmed', 'Shipping', 'Delivered', 'Cancelled']

export default function AdminOrdersPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('') // mã đơn đã bấm Tìm
  const [status, setStatus] = useState('') // '' = tất cả trạng thái
  const [page, setPage] = useState(1)

  const { data, isPending } = useQuery({
    queryKey: ['admin-orders', { search, status, page }],
    queryFn: () => fetchAdminOrders({ q: search, status, page: String(page), limit: '10' }),
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(q.trim())
    setPage(1)
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <h1 className="card-title font-serif">Quản lý đơn hàng {data && `(${data.total})`}</h1>

        <div className="flex flex-wrap gap-2 items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="search"
              className="input input-bordered input-sm w-56"
              placeholder="Tìm theo mã đơn..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="btn btn-sm">
              Tìm
            </button>
          </form>

          {/* Lọc theo trạng thái — đổi là lọc ngay, về trang 1 */}
          <select
            className="select select-bordered select-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>

        {isPending && <span className="loading loading-spinner" />}

        {data && data.items.length === 0 && (
          <p className="text-base-content/60 py-8 text-center">Không có đơn hàng nào</p>
        )}

        {data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày đặt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => {
                  const meta = ORDER_STATUS_META[order.status]
                  return (
                    <tr key={order.id}>
                      <td className="font-medium">{order.order_code}</td>
                      <td>
                        <p>{order.user.name}</p>
                        <p className="text-xs text-base-content/50">{order.user.email}</p>
                      </td>
                      <td className="whitespace-nowrap">{formatPrice(order.total)}</td>
                      <td>
                        <span className={`badge ${meta.badge} badge-sm`}>{meta.label}</span>
                      </td>
                      <td className="whitespace-nowrap text-sm">{formatDateTime(order.placed_at)}</td>
                      <td>
                        <Link to={`/admin/orders/${order.id}`} className="link link-primary">
                          Xem
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </div>
    </div>
  )
}
