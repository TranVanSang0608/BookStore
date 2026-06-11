import axios from 'axios'
import { clearStoredAuth, getStoredToken } from '../store/authStorage'

// Axios instance dùng chung — MỌI request API đều đi qua đây
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 10_000,
})

// Request interceptor: tự gắn JWT vào header cho TẤT CẢ request —
// đây là lý do cả app chỉ có 1 axios instance
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: nếu server trả 401 trong khi máy ĐANG giữ token
// (token hết hạn / user bị xóa) → xóa phiên và đưa về trang đăng nhập.
// Bỏ qua các request /auth/* — login sai mật khẩu cũng trả 401 nhưng không phải "hết phiên".
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status
    const url: string = error.config?.url ?? ''
    if (status === 401 && getStoredToken() && !url.startsWith('/auth')) {
      clearStoredAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Rút message lỗi tiếng Việt backend trả về để hiển thị lên form
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errors?: Array<{ field: string; message: string }> }
      | undefined
    // Lỗi validate Zod từ backend có mảng errors theo field — ghép lại cho cụ thể
    // (trường hợp FE đã validate nhưng vẫn lọt, vd 2 tab cùng sửa)
    if (data?.errors?.length) return data.errors.map((e) => e.message).join('. ')
    if (data?.message) return data.message
  }
  return 'Có lỗi xảy ra, vui lòng thử lại'
}
