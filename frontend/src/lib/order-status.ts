import type { OrderPayment, OrderStatus } from '../api/orders'

// Nhãn tiếng Việt + màu badge DaisyUI cho từng trạng thái đơn.
// Tập trung 1 chỗ để trang user lẫn admin hiển thị nhất quán.
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  Pending: { label: 'Chờ xác nhận', badge: 'badge-warning' },
  Confirmed: { label: 'Đã xác nhận', badge: 'badge-info' },
  Shipping: { label: 'Đang giao', badge: 'badge-primary' },
  Delivered: { label: 'Đã giao', badge: 'badge-success' },
  Cancelled: { label: 'Đã hủy', badge: 'badge-ghost' },
}

// Nhãn + màu cho TRẠNG THÁI THANH TOÁN (khác trạng thái đơn).
export const PAYMENT_STATUS_META: Record<OrderPayment['status'], { label: string; badge: string }> = {
  Pending: { label: 'Chờ thanh toán', badge: 'badge-warning' },
  Paid: { label: 'Đã thanh toán', badge: 'badge-success' },
  Failed: { label: 'Thanh toán thất bại', badge: 'badge-error' },
  Cancelled: { label: 'Đã hủy', badge: 'badge-ghost' },
}

// Nhãn phương thức thanh toán
export const PAYMENT_GATEWAY_LABEL: Record<OrderPayment['gateway'], string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  vnpay: 'VNPay',
}

// Thứ tự các bước admin (dùng để hiện nút "tiến bước" đúng luồng)
export const ADMIN_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Pending: 'Confirmed',
  Confirmed: 'Shipping',
  Shipping: 'Delivered',
}

// Đơn còn hủy được (cho cả nút user lẫn admin) khi chưa giao đi
export function isCancellable(status: OrderStatus): boolean {
  return status === 'Pending' || status === 'Confirmed'
}
