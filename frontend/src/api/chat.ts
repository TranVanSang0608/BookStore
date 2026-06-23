import { apiClient } from './client'

// Một tin nhắn trong hội thoại. role chỉ user/assistant — system prompt do BACKEND ghép.
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Sách rút gọn backend trả về để render thẻ (khớp ChatBook ở backend/modules/chat/tools.ts)
export interface ChatBook {
  id: number
  title: string
  author: string
  price: number
  stock: number
  coverUrl: string | null
  slug: string
  rating: number
}

export interface ChatResult {
  reply: string
  books: ChatBook[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
}

// Gửi vài lượt hội thoại gần nhất cho backend → nhận { reply, books }.
// timeout 60s (ghi đè mặc định 10s của apiClient): 1 lượt chat có thể gọi DeepSeek 2 lần
// (tool loop) nên cần nhiều thời gian hơn request thường.
export async function sendChat(messages: ChatMessage[]): Promise<ChatResult> {
  const { data } = await apiClient.post<ApiResponse<ChatResult>>(
    '/chat',
    { messages },
    { timeout: 60_000 },
  )
  return data.data
}
