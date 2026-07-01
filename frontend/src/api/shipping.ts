import { apiClient } from './client'

export interface ShippingFee {
  shipping_fee: number
  free_shipping_applied: boolean
  free_threshold: number | null
  distance_km?: number | null // km ước lượng (D62); null/undefined = đang dùng phí vùng cố định
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

// Ngưỡng miễn phí ship công khai (headline Navbar/Điều khoản). null = chưa cấu hình.
export interface PublicShippingInfo {
  free_threshold: number | null
}

export async function fetchShippingInfo(): Promise<PublicShippingInfo> {
  const { data } = await apiClient.get<ApiResponse<PublicShippingInfo>>('/shipping/info')
  return data.data
}

// ---------- Admin: quản lý phí ship theo tỉnh ----------

export interface ShippingZone {
  province_code: string
  province_name: string
  fee: number // phí cố định (fallback)
  free_threshold: number | null // ngưỡng miễn phí CHẾ ĐỘ FALLBACK
  distance_km: number | null // km ước lượng kho→tỉnh (D62); null = chưa tính
  distance_fee: number | null // phí ước tính theo km cho đơn nhỏ; null = chưa cấu hình
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

// Lưu hàng loạt nhiều tỉnh (nút "Lưu tất cả")
export async function updateShippingZonesBatchApi(
  zones: (ShippingZoneInput & { province_code: string })[],
): Promise<void> {
  await apiClient.put('/shipping/admin/zones', { zones })
}

// ---------- Cấu hình kho + công thức phí theo khoảng cách (D62) ----------

export interface ShippingConfig {
  warehouse_lat: number
  warehouse_lng: number
  base_fee: number
  per_km_fee: number
  free_km: number
  free_threshold: number | null // ngưỡng miễn phí TOÀN HỆ THỐNG (chế độ khoảng cách)
  max_fee: number | null
  road_factor: number
  enabled: boolean
}

export async function fetchShippingConfig(): Promise<ShippingConfig> {
  const { data } = await apiClient.get<ApiResponse<ShippingConfig>>('/shipping/admin/config')
  return data.data
}

// Lưu config → backend tự tính lại distance_km cho 34 tỉnh
export async function updateShippingConfigApi(input: ShippingConfig): Promise<void> {
  await apiClient.put('/shipping/admin/config', input)
}
