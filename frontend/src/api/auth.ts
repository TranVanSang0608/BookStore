import { apiClient } from './client'

// Kiểu user public — khớp PUBLIC_USER_SELECT bên backend (không bao giờ có password_hash)
export interface PublicUser {
  id: number
  email: string
  name: string
  phone: string | null
  role: 'user' | 'admin'
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
