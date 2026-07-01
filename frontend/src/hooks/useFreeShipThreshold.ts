import { useQuery } from '@tanstack/react-query'
import { fetchShippingInfo } from '../api/shipping'

// Ngưỡng miễn phí ship — admin sửa động ở /admin/shipping (không còn viết cứng "300.000đ").
// Mặc định 300.000đ để hiển thị NGAY (trước khi query xong, hoặc API chưa cấu hình).
// Dùng ở Navbar (top bar) + trang Điều khoản.
export const DEFAULT_FREE_SHIP_THRESHOLD = 300_000

export function useFreeShipThreshold(): number {
  const { data } = useQuery({
    queryKey: ['shipping-info'],
    queryFn: fetchShippingInfo,
    staleTime: 5 * 60 * 1000, // hiếm khi đổi
  })
  return data?.free_threshold ?? DEFAULT_FREE_SHIP_THRESHOLD
}
