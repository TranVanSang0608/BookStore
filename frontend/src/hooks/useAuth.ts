import { createContext, useContext } from 'react'
import type { PublicUser } from '../api/auth'
import type { StoredAuth } from '../store/authStorage'

// Context + hook đặt chung ở đây, TÁCH khỏi store/AuthContext.tsx vì quy tắc
// Fast Refresh của Vite: file chứa component chỉ được export component —
// lẫn context/hook vào là hot-reload không hoạt động đúng
// (lỗi eslint react-refresh/only-export-components).

export interface AuthContextValue {
  user: PublicUser | null
  isLoggedIn: boolean
  login: (auth: StoredAuth) => void
  logout: () => void
  updateUser: (user: PublicUser) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng bên trong <AuthProvider>')
  return ctx
}
