import { apiClient } from './client'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export type DiscountType = 'percentage' | 'fixed'

// Kết quả preview mã giảm giá ở trang checkout (BE tự lấy subtotal từ giỏ DB)
export interface VoucherPreview {
  code: string
  discount_type: DiscountType
  discount_value: number
  discount: number // số tiền được giảm (đồng)
}

export async function previewVoucherApi(code: string): Promise<VoucherPreview> {
  const { data } = await apiClient.post<ApiResponse<VoucherPreview>>('/vouchers/preview', { code })
  return data.data
}

// ---------- Admin ----------

export interface Voucher {
  id: number
  code: string
  discount_type: DiscountType
  discount_value: number
  min_order: number
  max_discount: number | null
  expire_at: string | null
  usage_limit: number | null
  used_count: number
  per_user_limit: number
  is_active: boolean
  created_at: string
}

// Payload form admin — số đã ép kiểu number; field optional gửi undefined để BE bỏ qua
export interface VoucherFormInput {
  code: string
  discount_type: DiscountType
  discount_value: number
  min_order: number
  max_discount?: number | null
  expire_at?: string | null
  usage_limit?: number | null
  per_user_limit: number
  is_active: boolean
}

export async function fetchAdminVouchers(): Promise<Voucher[]> {
  const { data } = await apiClient.get<ApiResponse<Voucher[]>>('/vouchers/admin')
  return data.data
}

export async function createVoucherApi(input: VoucherFormInput): Promise<Voucher> {
  const { data } = await apiClient.post<ApiResponse<Voucher>>('/vouchers/admin', input)
  return data.data
}

export async function updateVoucherApi(id: number, input: Partial<VoucherFormInput>): Promise<Voucher> {
  const { data } = await apiClient.put<ApiResponse<Voucher>>(`/vouchers/admin/${id}`, input)
  return data.data
}

export async function toggleVoucherApi(id: number): Promise<Voucher> {
  const { data } = await apiClient.patch<ApiResponse<Voucher>>(`/vouchers/admin/${id}/toggle`)
  return data.data
}

export async function deleteVoucherApi(id: number): Promise<void> {
  await apiClient.delete(`/vouchers/admin/${id}`)
}
