import { apiClient } from './client'

export interface Address {
  id: number
  recipient_name: string
  phone: string
  province_code: string
  ward_code: string
  province_name: string
  ward_name: string
  street_detail: string
  is_default: boolean
}

// FE chỉ gửi CODE — backend tự tra tên tỉnh/xã từ DB (xem address/service.ts bên BE)
export interface AddressInput {
  recipient_name: string
  phone: string
  province_code: string
  ward_code: string
  street_detail: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get<ApiResponse<Address[]>>('/addresses')
  return data.data
}

export async function createAddressApi(input: AddressInput): Promise<Address> {
  const { data } = await apiClient.post<ApiResponse<Address>>('/addresses', input)
  return data.data
}

export async function updateAddressApi(id: number, input: AddressInput): Promise<Address> {
  const { data } = await apiClient.put<ApiResponse<Address>>(`/addresses/${id}`, input)
  return data.data
}

export async function deleteAddressApi(id: number): Promise<void> {
  await apiClient.delete(`/addresses/${id}`)
}

export async function setDefaultAddressApi(id: number): Promise<void> {
  await apiClient.put(`/addresses/${id}/default`)
}
