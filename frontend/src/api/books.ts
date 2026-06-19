import { apiClient } from './client'
import type { Category } from './categories'

// Dữ liệu rút gọn cho 1 card sách ngoài trang list (khớp bookCardSelect bên BE)
export interface BookCardData {
  id: number
  title: string
  slug: string
  price: number
  stock_quantity: number
  cover_image_url: string | null
  avg_rating: number // Phase 8 — điểm trung bình (0 nếu chưa có review)
  review_count: number
  author: { id: number; name: string }
}

// Trang chi tiết có đầy đủ field + danh sách thể loại
export interface BookDetail extends BookCardData {
  description: string | null
  isbn: string | null
  publisher: string | null
  published_year: number | null
  language: string | null
  pages: number | null
  categories: Category[]
}

export interface BookListResult {
  items: BookCardData[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

// params truyền thẳng các query đang nằm trên URL (?q=...&category=...&page=...).
// Giá trị sai/thiếu backend tự thay bằng mặc định (Zod .catch) nên FE không cần validate.
export async function fetchBooks(params: Record<string, string>): Promise<BookListResult> {
  const { data } = await apiClient.get<ApiResponse<BookListResult>>('/books', { params })
  return data.data
}

export async function fetchBookBySlug(slug: string): Promise<BookDetail> {
  const { data } = await apiClient.get<ApiResponse<BookDetail>>(`/books/${slug}`)
  return data.data
}

// Sách liên quan (Phase 8) — cùng tác giả / thể loại, hiện dưới trang chi tiết
export async function fetchRelatedBooks(slug: string): Promise<BookCardData[]> {
  const { data } = await apiClient.get<ApiResponse<BookCardData[]>>(`/books/${slug}/related`)
  return data.data
}

// Sách bán chạy (khối trang chủ) — top theo lượng đã bán trong đơn Delivered
export async function fetchBestsellers(limit = 5): Promise<BookCardData[]> {
  const { data } = await apiClient.get<ApiResponse<BookCardData[]>>('/books/bestsellers', {
    params: { limit: String(limit) },
  })
  return data.data
}

// Lấy nhiều sách theo id — trang giỏ của GUEST dùng để enrich localStorage
// (chỉ có book_id + qty) thành dòng giỏ đầy đủ với giá/tên/bìa HIỆN TẠI.
// Sách bị ẩn/xóa sẽ vắng mặt trong kết quả → trang giỏ hiện cảnh báo.
export async function fetchBooksByIds(ids: number[]): Promise<BookCardData[]> {
  if (ids.length === 0) return []
  const { data } = await apiClient.get<ApiResponse<BookCardData[]>>('/books/batch', {
    params: { ids: ids.join(',') },
  })
  return data.data
}

// ---------- Admin (các API dưới đây yêu cầu token admin) ----------

// Payload tạo/sửa sách — khớp createBookSchema bên BE
export interface BookInput {
  title: string
  description?: string
  price: number
  stock_quantity: number
  author_id: number
  category_ids: number[]
  cover_image_url?: string
  isbn?: string
  publisher?: string
  published_year?: number
  language?: string
  pages?: number
}

// Dòng trong bảng admin: thêm is_active để hiện badge Ẩn/Đang bán
export interface AdminBookRow extends BookCardData {
  is_active: boolean
  created_at: string
}

export interface AdminBookListResult {
  items: AdminBookRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Chi tiết cho form sửa — như BookDetail nhưng kèm is_active (lấy được cả sách đang ẩn)
export interface AdminBookDetail extends BookDetail {
  is_active: boolean
}

export async function fetchAdminBooks(params: Record<string, string>): Promise<AdminBookListResult> {
  const { data } = await apiClient.get<ApiResponse<AdminBookListResult>>('/books/admin', { params })
  return data.data
}

export async function fetchAdminBook(id: number): Promise<AdminBookDetail> {
  const { data } = await apiClient.get<ApiResponse<AdminBookDetail>>(`/books/admin/${id}`)
  return data.data
}

export async function createBookApi(input: BookInput): Promise<AdminBookDetail> {
  const { data } = await apiClient.post<ApiResponse<AdminBookDetail>>('/books', input)
  return data.data
}

export async function updateBookApi(id: number, input: BookInput): Promise<AdminBookDetail> {
  const { data } = await apiClient.put<ApiResponse<AdminBookDetail>>(`/books/${id}`, input)
  return data.data
}

export async function setBookActiveApi(id: number, isActive: boolean): Promise<void> {
  await apiClient.put(`/books/${id}/active`, { is_active: isActive })
}
