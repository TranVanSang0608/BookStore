import { apiClient } from './client'

// Kiểu user public — khớp PUBLIC_USER_SELECT bên backend (không bao giờ có password_hash)
export interface PublicUser {
  id: number
  email: string
  name: string
  phone: string | null
  role: 'user' | 'admin'
  email_verified: boolean
  created_at: string
}

export interface AuthData {
  user: PublicUser
  token: string
}

// Backend luôn trả { success, data } — bóc sẵn .data.data cho component dùng gọn
interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string
}

export async function registerApi(input: RegisterInput): Promise<AuthData> {
  const { data } = await apiClient.post<ApiResponse<AuthData>>('/auth/register', input)
  return data.data
}

export async function loginApi(input: { email: string; password: string }): Promise<AuthData> {
  const { data } = await apiClient.post<ApiResponse<AuthData>>('/auth/login', input)
  return data.data
}

// Đăng nhập Google (D60): gửi ID token (credential) lấy từ Google Identity Services;
// backend verify rồi trả về { user, token } CÙNG shape login → tái dùng nguyên flow login()
export async function googleLoginApi(credential: string): Promise<AuthData> {
  const { data } = await apiClient.post<ApiResponse<AuthData>>('/auth/google', { credential })
  return data.data
}

// ----- Phase 6: xác thực email + quên/đặt lại mật khẩu -----

// Xác thực email bằng token lấy từ link trong email
export async function verifyEmailApi(token: string): Promise<{ verified: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ verified: boolean }>>('/auth/verify-email', { token })
  return data.data
}

// Gửi lại email xác thực (cần đăng nhập — interceptor tự gắn token)
export async function resendVerificationApi(): Promise<{ sent: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ sent: boolean }>>('/auth/resend-verification')
  return data.data
}

// Quên mật khẩu — backend luôn trả thông báo chung (chống dò tài khoản)
export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email })
  return data.data
}

// Đặt lại mật khẩu bằng token từ link + mật khẩu mới
export async function resetPasswordApi(token: string, password: string): Promise<{ reset: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ reset: boolean }>>('/auth/reset-password', { token, password })
  return data.data
}
