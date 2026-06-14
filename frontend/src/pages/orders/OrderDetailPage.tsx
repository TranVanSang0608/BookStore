import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { cancelOrderApi, fetchOrderByCode, startVnpayPaymentApi } from '../../api/orders'
import { getApiErrorMessage } from '../../api/client'
import CoverImage from '../../features/catalog/CoverImage'
import { formatDateTime, formatPrice } from '../../lib/format'
import {
  ORDER_STATUS_META,
  PAYMENT_GATEWAY_LABEL,
  PAYMENT_STATUS_META,
} from '../../lib/order-status'

export default function OrderDetailPage() {
  const { code } = useParams()
  const queryClient = useQueryClient()
  // ?payment=success|failed|invalid — VNPay redirect về kèm tham số này để hiện banner kết quả.
  // Backend đã đối soát + cập nhật Payment TRƯỚC khi redirect, nên query bên dưới fetch ra trạng thái mới.
  const [searchParams] = useSearchParams()
  const paymentResult = searchParams.get('payment')

  const { data: order, isPending, isError } = useQuery({
    queryKey: ['order', code],
    queryFn: () => fetchOrderByCode(code!),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrderApi(code!),
    onSuccess: () => {
      // Đơn đổi trạng thái → cập nhật cả chi tiết lẫn danh sách đơn
      queryClient.invalidateQueries({ queryKey: ['order', code] })
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })

  // Thử lại / tiếp tục thanh toán VNPay → redirect sang cổng
  const vnpayMutation = useMutation({
    mutationFn: () => startVnpayPaymentApi(code!),
    onSuccess: (url) => {
      window.location.href = url
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
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="alert alert-error">Không tìm thấy đơn hàng</div>
        <Link to="/orders" className="link link-primary mt-4 inline-block">
          ← Về danh sách đơn hàng
        </Link>
      </div>
    )
  }

  const meta = ORDER_STATUS_META[order.status]
  // Lần thử thanh toán mới nhất (payments xếp theo id tăng dần → phần tử cuối là mới nhất)
  const payment = order.payments[order.payments.length - 1]
  const paymentMeta = payment ? PAYMENT_STATUS_META[payment.status] : null
  // Hiện nút thanh toán VNPay khi: đơn còn chờ xác nhận + lần thử VNPay chưa thành công
  const canPayVnpay =
    order.status === 'Pending' &&
    payment?.gateway === 'vnpay' &&
    (payment.status === 'Pending' || payment.status === 'Failed')

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Đơn {order.order_code}</h1>
          <p className="text-sm text-base-content/60">Đặt lúc {formatDateTime(order.placed_at)}</p>
        </div>
        <span className={`badge ${meta.badge} badge-lg`}>{meta.label}</span>
      </div>

      {/* Banner kết quả thanh toán VNPay (đọc từ ?payment=... khi cổng redirect về) */}
      {paymentResult === 'success' && (
        <div className="alert alert-success text-sm">Thanh toán VNPay thành công! Cảm ơn bạn đã đặt hàng.</div>
      )}
      {paymentResult === 'failed' && (
        <div className="alert alert-error text-sm">
          Thanh toán VNPay chưa thành công. Bạn có thể thử lại bên dưới.
        </div>
      )}
      {paymentResult === 'invalid' && (
        <div className="alert alert-warning text-sm">Không xác minh được kết quả thanh toán.</div>
      )}

      {cancelMutation.isError && (
        <div className="alert alert-error text-sm">{getApiErrorMessage(cancelMutation.error)}</div>
      )}
      {vnpayMutation.isError && (
        <div className="alert alert-error text-sm">{getApiErrorMessage(vnpayMutation.error)}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Địa chỉ giao (snapshot lúc đặt) */}
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-1">
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

        {/* Thanh toán + tiền */}
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-1">
            <h2 className="card-title text-base">Thanh toán</h2>
            <p className="text-sm flex items-center gap-2 flex-wrap">
              <span>
                Hình thức:{' '}
                <span className="font-medium">
                  {payment ? PAYMENT_GATEWAY_LABEL[payment.gateway] : '—'}
                </span>
              </span>
              {paymentMeta && <span className={`badge ${paymentMeta.badge} badge-sm`}>{paymentMeta.label}</span>}
            </p>

            {canPayVnpay && (
              <button
                className="btn btn-primary btn-sm w-fit"
                disabled={vnpayMutation.isPending}
                onClick={() => vnpayMutation.mutate()}
              >
                {vnpayMutation.isPending && <span className="loading loading-spinner loading-sm" />}
                {payment?.status === 'Failed' ? 'Thử lại thanh toán VNPay' : 'Thanh toán VNPay'}
              </button>
            )}

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

      {/* Danh sách sách trong đơn */}
      <div className="card bg-base-100 shadow">
        <div className="card-body p-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th colSpan={2}>Sách</th>
                <th>Đơn giá</th>
                <th>SL</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="w-14">
                    <CoverImage
                      url={item.cover_image_url_snapshot}
                      title={item.book_title}
                      className="w-10 h-14 rounded"
                    />
                  </td>
                  <td>
                    <p className="font-medium">{item.book_title}</p>
                    <p className="text-sm text-base-content/60">{item.book_author_name}</p>
                  </td>
                  <td className="whitespace-nowrap">{formatPrice(item.price_at_order)}</td>
                  <td>{item.quantity}</td>
                  <td className="whitespace-nowrap font-medium">
                    {formatPrice(item.price_at_order * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to="/orders" className="btn btn-ghost">
          ← Đơn hàng của tôi
        </Link>
        {/* User chỉ hủy được khi đơn còn Pending (chờ xác nhận) */}
        {order.status === 'Pending' && (
          <button
            className="btn btn-error btn-outline"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (window.confirm('Hủy đơn hàng này?')) cancelMutation.mutate()
            }}
          >
            {cancelMutation.isPending && <span className="loading loading-spinner loading-sm" />}
            Hủy đơn
          </button>
        )}
      </div>
    </div>
  )
}
