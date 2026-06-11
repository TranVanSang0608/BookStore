import { z } from 'zod'

// Lớp đọc/ghi localStorage tách riêng để cả AuthContext lẫn axios interceptor
// dùng chung mà không import vòng tròn (client.ts ← authStorage ← AuthContext)
const STORAGE_KEY = 'bookstore_auth'

// localStorage là dữ liệu NGOÀI tầm kiểm soát của app (user/extension sửa được tùy ý)
// → phải validate shape bằng Zod như validate input từ client ở backend.
// Thiếu token, thiếu user, sai kiểu... đều bị coi là chưa đăng nhập (không crash app).
const storedAuthSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.number(),
    email: z.string(),
    name: z.string(),
    phone: z.string().nullable(),
    role: z.enum(['user', 'admin']),
    created_at: z.string(),
  }),
})

export type StoredAuth = z.infer<typeof storedAuthSchema>

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const result = storedAuthSchema.safeParse(JSON.parse(raw))
    if (!result.success) {
      localStorage.removeItem(STORAGE_KEY) // dữ liệu hỏng → dọn luôn cho sạch
      return null
    }
    return result.data
  } catch {
    // JSON.parse ném lỗi (không phải JSON) → cũng dọn và coi như chưa đăng nhập
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveStoredAuth(auth: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getStoredToken(): string | null {
  return loadStoredAuth()?.token ?? null
}
