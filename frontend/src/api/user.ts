import type { PublicUser } from './auth'
import { apiClient } from './client'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function updateProfileApi(input: {
  name: string
  phone?: string
}): Promise<PublicUser> {
  const { data } = await apiClient.put<ApiResponse<PublicUser>>('/users/me', input)
  return data.data
}

// Trả về token MỚI: đổi mật khẩu làm token cũ hết hiệu lực ở backend, FE phải thay bằng token này
export async function changePasswordApi(input: {
  current_password: string
  new_password: string
}): Promise<string> {
  const { data } = await apiClient.put<ApiResponse<{ token: string }>>('/users/me/password', input)
  return data.data.token
}
