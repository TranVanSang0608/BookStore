import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { fetchAdminOrder, updateOrderStatusApi, type OrderStatus } from '../../api/orders'
import { formatDateTime, formatPrice } from '../../lib/format'
import {
  ADMIN_NEXT_STATUS,
  isCancellable,
  ORDER_STATUS_META,
  PAYMENT_GATEWAY_LABEL,
  PAYMENT_STATUS_META,
} from '../../lib/order-status'

// Nhãn nút cho từng bước tiến (rõ nghĩa hơn là chỉ tên trạng thái đích)
const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  Confirmed: 'Xác nhận đơn',
  Shipping: 'Bắt đầu giao',
  Delivered: 'Đã giao xong',
}

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const queryClient = useQueryClient()

  const { data: order, isPending, isError } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => fetchAdminOrder(orderId),
  })

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatusApi(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (isError || !order) {
    return <div className="alert alert-error">Không tìm thấy đơn hàng</div>
  }

  const meta = ORDER_STATUS_META[order.status]
  const nextStatus = ADMIN_NEXT_STATUS[order.status] // bước tiến hợp lệ kế tiếp (nếu có)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Đơn {order.order_code}</h1>
          <p className="text-sm text-base-content/60">Đặt lúc {formatDateTime(order.placed_at)}</p>
        </div>
        <span className={`badge ${meta.badge} badge-lg`}>{meta.label}</span>
      </div>

      {statusMutation.isError && (
        <div className="alert alert-error text-sm">{getApiErrorMessage(statusMutation.error)}</div>
      )}

      {/* Khu thao tác trạng thái */}
      <div className="card bg-base-100 shadow">
        <div className="card-body flex-row flex-wrap gap-2 items-center">
          {nextStatus && (
            <button
              className="btn btn-primary btn-sm"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(nextStatus)}
            >
              {ADVANCE_LABEL[nextStatus]}
            </button>
          )}
          {isCancellable(order.status) && (
            <button
              className="btn btn-error btn-outline btn-sm"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (window.confirm('Hủy đơn này và hoàn kho?')) statusMutation.mutate('Cancelled')
              }}
            >
              Hủy đơn
            </button>
          )}
          {!nextStatus && !isCancellable(order.status) && (
            <p className="text-sm text-base-content/60">Đơn đã ở trạng thái cuối, không thể thay đổi</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Khách + địa chỉ giao (snapshot) */}
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-1">
            <h2 className="card-title text-base">Khách hàng</h2>
            {order.user && (
              <p className="text-sm">
                {order.user.name} <span className="text-base-content/50">({order.user.email})</span>
              </p>
            )}
            <div className="divider my-1" />
            <h2 className="card-title text-base">Giao tới</h2>
            <p className="font-semibold">
              {order.shipping_recipient_name}{' '}
              <span className="font-normal text-base-content/60">| {order.shipping_phone}</span>
            </p>
            <p className="text-sm text-base-content/80">
              {order.shipping_street}, {order.shipping_ward_name}, {order.shipping_province_name}
            </p>
            {order.note && <p className="text-sm text-base-content/60">Ghi chú: {order.note}</p>}
          </div>
        </div>

        {/* Tiền */}
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-1">
            <h2 className="card-title text-base">Thanh toán</h2>
            {(() => {
              // Lần thử mới nhất (payments xếp id tăng dần) — VNPay retry tạo nhiều row
              const payment = order.payments[order.payments.length - 1]
              if (!payment) return <p className="text-sm">—</p>
              return (
                <p className="text-sm flex items-center gap-2 flex-wrap">
                  <span>{PAYMENT_GATEWAY_LABEL[payment.gateway]}</span>
                  <span className={`badge ${PAYMENT_STATUS_META[payment.status].badge} badge-sm`}>
                    {PAYMENT_STATUS_META[payment.status].label}
                  </span>
                </p>
              )
            })()}
            <div className="divider my-1" />
            <div className="flex justify-between text-sm">
              <span>Tạm tính</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Phí vận chuyển</span>
              <span>{order.shipping_fee === 0 ? 'Miễn phí' : formatPrice(order.shipping_fee)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dòng hàng */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-4 overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Sách</th>
                <th>Đơn giá</th>
                <th>SL</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <p className="font-medium">{item.book_title}</p>
                    <p className="text-xs text-base-content/60">{item.book_author_name}</p>
                  </td>
                  <td className="whitespace-nowrap">{formatPrice(item.price_at_order)}</td>
                  <td>{item.quantity}</td>
                  <td className="whitespace-nowrap">{formatPrice(item.price_at_order * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Link to="/admin/orders" className="btn btn-ghost btn-sm">
        ← Danh sách đơn
      </Link>
    </div>
  )
}
