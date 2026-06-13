import { apiClient } from './client'
import type { BookCardData } from './books'

// GET /api/authors chỉ trả id + name — đủ cho dropdown form admin
export interface AuthorOption {
  id: number
  name: string
}

export interface AuthorDetail {
  id: number
  name: string
  bio: string | null
  photo_url: string | null
  books: BookCardData[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

export async function fetchAuthors(): Promise<AuthorOption[]> {
  const { data } = await apiClient.get<ApiResponse<AuthorOption[]>>('/authors')
  return data.data
}

export async function fetchAuthor(id: number): Promise<AuthorDetail> {
  const { data } = await apiClient.get<ApiResponse<AuthorDetail>>(`/authors/${id}`)
  return data.data
}

// ---------- Admin ----------

export interface AuthorInput {
  name: string
  bio?: string
  photo_url?: string
}

export async function createAuthorApi(input: AuthorInput): Promise<AuthorOption> {
  const { data } = await apiClient.post<ApiResponse<AuthorOption>>('/authors', input)
  return data.data
}

export async function updateAuthorApi(id: number, input: AuthorInput): Promise<AuthorOption> {
  const { data } = await apiClient.put<ApiResponse<AuthorOption>>(`/authors/${id}`, input)
  return data.data
}

export async function deleteAuthorApi(id: number): Promise<void> {
  await apiClient.delete(`/authors/${id}`)
}
