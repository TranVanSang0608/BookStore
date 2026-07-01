import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Bọc các trang cần đăng nhập: chưa đăng nhập → đá về /login,
// kèm state.from để login xong quay lại đúng trang đang định vào
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  const from = `${location.pathname}${location.search}${location.hash}`

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from }} />
  }
  return <>{children}</>
}
