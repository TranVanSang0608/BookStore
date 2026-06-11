import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { PublicUser } from '../api/auth'
import { AuthContext } from '../hooks/useAuth'
import {
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
  type StoredAuth,
} from './authStorage'

// "Client state" về phiên đăng nhập — khác với "server state" do React Query quản.
// File này CHỈ export component AuthProvider (quy tắc Fast Refresh);
// context object + hook useAuth nằm ở hooks/useAuth.ts.

export function AuthProvider({ children }: { children: ReactNode }) {
  // useState(hàm): chỉ đọc localStorage MỘT lần lúc khởi tạo, không phải mỗi render —
  // nhờ vậy F5 trang vẫn giữ phiên đăng nhập
  const [auth, setAuth] = useState<StoredAuth | null>(loadStoredAuth)

  // AuthProvider nằm trong QueryClientProvider (xem main.tsx) nên dùng được queryClient.
  // queryClient.clear() khi đổi phiên: xóa sạch cache React Query để dữ liệu riêng tư
  // của tài khoản trước (địa chỉ, sau này là giỏ hàng/đơn hàng) không lóe sang tài khoản sau.
  const queryClient = useQueryClient()

  const login = (next: StoredAuth) => {
    queryClient.clear() // gọi cả ở login: cover trường hợp đổi tài khoản mà không bấm logout
    saveStoredAuth(next)
    setAuth(next)
  }

  const logout = () => {
    clearStoredAuth()
    setAuth(null)
    queryClient.clear()
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
