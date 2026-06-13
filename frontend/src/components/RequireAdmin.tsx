import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Bọc khu vực /admin: chưa đăng nhập → về /login (như RequireAuth),
// đã đăng nhập nhưng không phải admin → đá về trang chủ.
// LƯU Ý: đây chỉ là chặn về GIAO DIỆN — bảo mật thật nằm ở backend (middleware adminOnly),
// user thường có sửa được JS trên trình duyệt cũng chỉ thấy khung trống vì API trả 403.
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user!.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
