import type { BookCardData } from './books'
import { apiClient } from './client'

interface ApiResponse<T> {
  success: boolean
  data: T
}

// Thích / bỏ thích 1 sách — trả trạng thái mới
export async function toggleWishlistApi(bookId: number): Promise<{ wishlisted: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ wishlisted: boolean }>>(`/wishlist/${bookId}/toggle`)
  return data.data
}

// Danh sách sách đã thích (đầy đủ card)
export async function fetchWishlist(): Promise<BookCardData[]> {
  const { data } = await apiClient.get<ApiResponse<BookCardData[]>>('/wishlist')
  return data.data
}

// Chỉ [book_id] — để tô tim đầy/rỗng trên thẻ sách ở trang /books
export async function fetchWishlistIds(): Promise<number[]> {
  const { data } = await apiClient.get<ApiResponse<number[]>>('/wishlist/ids')
  return data.data
}
