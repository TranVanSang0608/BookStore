import { apiClient } from './client'

interface ApiResponse<T> {
  success: boolean
  data: T
}

// Thông tin shop (cấu hình admin sửa được). Hiển thị ở Footer/Navbar.
export interface SiteSettings {
  shop_hotline: string
  shop_email: string
  shop_address: string
}

// Công khai — không cần đăng nhập
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const { data } = await apiClient.get<ApiResponse<SiteSettings>>('/settings')
  return data.data
}

// Admin cập nhật (gửi phần nào sửa phần đó — backend bỏ qua field undefined)
export async function updateSiteSettingsApi(input: Partial<SiteSettings>): Promise<SiteSettings> {
  const { data } = await apiClient.put<ApiResponse<SiteSettings>>('/settings/admin', input)
  return data.data
}
