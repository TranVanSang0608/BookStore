import { createContext, useContext, useState, type ReactNode } from 'react'
import type { PublicUser } from '../api/auth'
import {
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
  type StoredAuth,
} from './authStorage'

// "Client state" về phiên đăng nhập — khác với "server state" do React Query quản.
// Mọi component gọi useAuth() đều thấy cùng một user và tự re-render khi login/logout.

interface AuthContextValue {
  user: PublicUser | null
  isLoggedIn: boolean
  login: (auth: StoredAuth) => void
  logout: () => void
  updateUser: (user: PublicUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // useState(hàm): chỉ đọc localStorage MỘT lần lúc khởi tạo, không phải mỗi render —
  // nhờ vậy F5 trang vẫn giữ phiên đăng nhập
  const [auth, setAuth] = useState<StoredAuth | null>(loadStoredAuth)

  const login = (next: StoredAuth) => {
    saveStoredAuth(next)
    setAuth(next)
  }

  const logout = () => {
    clearStoredAuth()
    setAuth(null)
  }

  // Sau khi PUT /users/me thành công, đồng bộ user mới vào context + localStorage
  // (giữ nguyên token) — navbar "Xin chào, ..." tự cập nhật theo
  const updateUser = (user: PublicUser) => {
    setAuth((prev) => {
      if (!prev) return prev
      const next = { ...prev, user }
      saveStoredAuth(next)
      return next
    })
  }

  return (
    <AuthContext.Provider
      value={{ user: auth?.user ?? null, isLoggedIn: auth !== null, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>')
  return ctx
}
