import { apiClient } from './client'

interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface Review {
  id: number
  rating: number
  comment: string | null
  user_name: string
  created_at: string
  updated_at: string
}

export interface ReviewListResult {
  items: Review[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// review của chính mình (đổ vào form sửa)
export interface MyReview {
  id: number
  rating: number
  comment: string | null
  updated_at: string
}

export interface ReviewStatus {
  can_review: boolean // đã mua + nhận sách chưa
  my_review: MyReview | null
}

// Public — danh sách review của 1 sách
export async function fetchReviews(bookId: number, page = 1): Promise<ReviewListResult> {
  const { data } = await apiClient.get<ApiResponse<ReviewListResult>>(`/reviews/book/${bookId}`, {
    params: { page: String(page) },
  })
  return data.data
}

// Auth — trạng thái review của tôi cho sách (quyết định hiện form hay không)
export async function fetchReviewStatus(bookId: number): Promise<ReviewStatus> {
  const { data } = await apiClient.get<ApiResponse<ReviewStatus>>(`/reviews/book/${bookId}/me`)
  return data.data
}

// Auth — tạo mới / sửa review của tôi
export async function upsertReviewApi(
  bookId: number,
  input: { rating: number; comment?: string },
): Promise<void> {
  await apiClient.post(`/reviews/book/${bookId}`, input)
}

// Auth — xóa review của tôi
export async function deleteReviewApi(bookId: number): Promise<void> {
  await apiClient.delete(`/reviews/book/${bookId}`)
}
