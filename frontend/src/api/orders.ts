import { apiClient } from './client'

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipping' | 'Delivered' | 'Cancelled'

// 1 dòng hàng trong đơn — toàn bộ là SNAPSHOT lúc đặt (không phụ thuộc sách hiện tại)
export interface OrderItem {
  book_id: number | null // null nếu sách đã bị xóa (onDelete SetNull) — vẫn đọc được snapshot
  book_title: string
  book_author_name: string
  price_at_order: number
  cover_image_url_snapshot: string | null
  quantity: number
}

export interface OrderPayment {
  gateway: 'cod' | 'vnpay'
  status: 'Pending' | 'Paid' | 'Failed' | 'Cancelled'
  amount: number
  paid_at: string | null
}

// Chi tiết đơn đầy đủ (GET /orders/:code và admin detail)
export interface OrderDetail {
  id: number
  order_code: string
  status: OrderStatus
  subtotal: number
  shipping_fee: number
  discount_amount: number
  total: number
  note: string | null
  placed_at: string
  cancelled_at: string | null
  shipping_recipient_name: string
  shipping_phone: string
  shipping_province_name: string
  shipping_ward_name: string
  shipping_street: string
  items: OrderItem[]
  payments: OrderPayment[]
  user?: { name: string; email: string } // chỉ có ở admin detail
}

// 1 dòng trong danh sách đơn của user
export interface OrderSummary {
  order_code: string
  status: OrderStatus
  total: number
  placed_at: string
  items: Array<{ book_title: string; quantity: number }>
}

// 1 dòng trong bảng admin
export interface AdminOrderSummary {
  id: number
  order_code: string
  status: OrderStatus
  total: number
  placed_at: string
  user: { name: string; email: string }
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface CreateOrderInput {
  address_id: number
  note?: string
  payment_method: 'cod' | 'vnpay'
}

// Đơn VNPay trả thêm payment_url để FE redirect sang cổng thanh toán
export interface CreateOrderResult extends OrderDetail {
  payment_url?: string
}

// ---------- User ----------

export async function createOrderApi(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { data } = await apiClient.post<ApiResponse<CreateOrderResult>>('/orders', input)
  return data.data
}

// Khởi tạo / thử lại thanh toán VNPay cho 1 đơn → URL cổng VNPay
export async function startVnpayPaymentApi(orderCode: string): Promise<string> {
  const { data } = await apiClient.post<ApiResponse<{ payment_url: string }>>('/payments/vnpay/create', {
    order_code: orderCode,
  })
  return data.data.payment_url
}

export async function fetchMyOrders(params: Record<string, string>): Promise<Paginated<OrderSummary>> {
  const { data } = await apiClient.get<ApiResponse<Paginated<OrderSummary>>>('/orders', { params })
  return data.data
}

export async function fetchOrderByCode(code: string): Promise<OrderDetail> {
  const { data } = await apiClient.get<ApiResponse<OrderDetail>>(`/orders/${code}`)
  return data.data
}

export async function cancelOrderApi(code: string): Promise<OrderDetail> {
  const { data } = await apiClient.put<ApiResponse<OrderDetail>>(`/orders/${code}/cancel`)
  return data.data
}

// ---------- Admin ----------

export async function fetchAdminOrders(params: Record<string, string>): Promise<Paginated<AdminOrderSummary>> {
  const { data } = await apiClient.get<ApiResponse<Paginated<AdminOrderSummary>>>('/orders/admin', { params })
  return data.data
}

export async function fetchAdminOrder(id: number): Promise<OrderDetail> {
  const { data } = await apiClient.get<ApiResponse<OrderDetail>>(`/orders/admin/${id}`)
  return data.data
}

export async function updateOrderStatusApi(id: number, status: OrderStatus): Promise<OrderDetail> {
  const { data } = await apiClient.put<ApiResponse<OrderDetail>>(`/orders/admin/${id}/status`, { status })
  return data.data
}
