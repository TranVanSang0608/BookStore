import { useAuth } from '../../store/AuthContext'

// Placeholder cho Lát 5 — hiện chỉ chứng minh RequireAuth hoạt động.
// Lát 5 sẽ thay bằng trang profile thật (sửa thông tin, đổi mật khẩu, sổ địa chỉ).
export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="py-16 px-4 text-center space-y-2">
      <h1 className="text-2xl font-bold">Tài khoản của tôi</h1>
      <p>
        Đăng nhập với: <span className="font-semibold">{user!.email}</span>
      </p>
      <p className="text-base-content/60">Trang này sẽ hoàn thiện ở Lát 5 (profile + sổ địa chỉ).</p>
    </div>
  )
}
