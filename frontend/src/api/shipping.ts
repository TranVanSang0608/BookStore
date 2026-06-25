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

// ---------- Admin: quản lý phí ship theo tỉnh ----------

export interface ShippingZone {
  province_code: string
  province_name: string
  fee: number
  free_threshold: number | null // null = tỉnh này không áp dụng miễn phí ship
}

export interface ShippingZoneInput {
  fee: number
  free_threshold: number | null
}

export async function fetchAdminShippingZones(): Promise<ShippingZone[]> {
  const { data } = await apiClient.get<ApiResponse<ShippingZone[]>>('/shipping/admin/zones')
  return data.data
}

export async function updateShippingZoneApi(
  provinceCode: string,
  input: ShippingZoneInput,
): Promise<void> {
  await apiClient.put(`/shipping/admin/zones/${provinceCode}`, input)
}
