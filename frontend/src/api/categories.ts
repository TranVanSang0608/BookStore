import { apiClient } from './client'

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  book_count?: number // số sách đang bán trong thể loại (chỉ có ở GET /categories)
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<ApiResponse<Category[]>>('/categories')
  return data.data
}

// ---------- Admin ----------

export interface CategoryInput {
  name: string
  description?: string
}

export async function createCategoryApi(input: CategoryInput): Promise<Category> {
  const { data } = await apiClient.post<ApiResponse<Category>>('/categories', input)
  return data.data
}

export async function updateCategoryApi(id: number, input: CategoryInput): Promise<Category> {
  const { data } = await apiClient.put<ApiResponse<Category>>(`/categories/${id}`, input)
  return data.data
}

export async function deleteCategoryApi(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}
