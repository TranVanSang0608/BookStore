import { apiClient } from './client'
import type { BookCardData } from './books'

// Sách trong dòng giỏ: như card + is_active để hiện cảnh báo "không còn bán"
export interface CartBook extends BookCardData {
  is_active: boolean
}

export interface CartItemData {
  book_id: number
  quantity: number
  book: CartBook
}

export interface CartData {
  items: CartItemData[]
  subtotal: number // backend tính, chỉ gồm sách còn bán
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function fetchCart(): Promise<CartData> {
  const { data } = await apiClient.get<ApiResponse<CartData>>('/cart')
  return data.data
}

// Mọi mutation đều trả về giỏ MỚI hoàn chỉnh — FE không phải tự tính lại
export async function addCartItemApi(bookId: number, quantity: number): Promise<CartData> {
  const { data } = await apiClient.post<ApiResponse<CartData>>('/cart/items', {
    book_id: bookId,
    quantity,
  })
  return data.data
}

export async function updateCartItemApi(bookId: number, quantity: number): Promise<CartData> {
  const { data } = await apiClient.put<ApiResponse<CartData>>(`/cart/items/${bookId}`, { quantity })
  return data.data
}

export async function removeCartItemApi(bookId: number): Promise<CartData> {
  const { data } = await apiClient.delete<ApiResponse<CartData>>(`/cart/items/${bookId}`)
  return data.data
}

// Merge guest cart vào DB cart khi login — backend resolve trùng bằng max(qty)
export async function mergeCartApi(items: Array<{ book_id: number; quantity: number }>): Promise<CartData> {
  const { data } = await apiClient.post<ApiResponse<CartData>>('/cart/merge', { items })
  return data.data
}
