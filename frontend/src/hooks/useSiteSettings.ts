import { useQuery } from '@tanstack/react-query'
import { fetchSiteSettings, type SiteSettings } from '../api/settings'

// Giá trị mặc định hiển thị NGAY (trước khi query xong, hoặc nếu API lỗi) — khớp default backend.
// Nhờ vậy Footer/Navbar không bao giờ trống thông tin shop.
const DEFAULTS: SiteSettings = {
  shop_hotline: '1900 1234',
  shop_email: 'hello@anhsach.vn',
  shop_address: '123 Lê Lợi, Q.1, TP.HCM',
}

// Thông tin shop dùng ở Footer/Navbar. staleTime dài vì hiếm khi đổi.
export function useSiteSettings(): SiteSettings {
  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
  })
  return data ?? DEFAULTS
}
