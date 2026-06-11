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

export async function changePasswordApi(input: {
  current_password: string
  new_password: string
}): Promise<void> {
  await apiClient.put('/users/me/password', input)
}
