import { apiClient } from './client'

export interface ShippingFee {
  shipping_fee: number
  free_shipping_applied: boolean
  free_threshold: number | null
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

// Phí ship LUÔN do backend tính (cùng hàm calcShippingFee mà Phase 4 createOrder dùng) —
// FE chỉ hiển thị, không bao giờ tự cộng trừ phí
export async function fetchShippingFee(provinceCode: string, subtotal: number): Promise<ShippingFee> {
  const { data } = await apiClient.get<ApiResponse<ShippingFee>>('/shipping/fee', {
    params: { province_code: provinceCode, subtotal },
  })
  return data.data
}
