import { apiClient } from './client'

export interface Province {
  code: string
  name: string
}

export interface Ward {
  code: string
  name: string
  province_code: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function fetchProvinces(): Promise<Province[]> {
  const { data } = await apiClient.get<ApiResponse<Province[]>>('/locations/provinces')
  return data.data
}

export async function fetchWards(provinceCode: string): Promise<Ward[]> {
  const { data } = await apiClient.get<ApiResponse<Ward[]>>(
    `/locations/provinces/${provinceCode}/wards`,
  )
  return data.data
}
