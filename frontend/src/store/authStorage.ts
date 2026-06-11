import type { PublicUser } from '../api/auth'

// Lớp đọc/ghi localStorage tách riêng để cả AuthContext lẫn axios interceptor
// dùng chung mà không import vòng tròn (client.ts ← authStorage ← AuthContext)
const STORAGE_KEY = 'bookstore_auth'

export interface StoredAuth {
  token: string
  user: PublicUser
}

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null // dữ liệu hỏng (user tự sửa localStorage) → coi như chưa đăng nhập
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
