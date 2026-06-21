import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmailApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'
import { useAuth } from '../../hooks/useAuth'

// Guard ở MỨC MODULE (ngoài component) → sống sót qua StrictMode mount-kép lẫn remount,
// bảo đảm mỗi token chỉ gọi API xác thực ĐÚNG 1 LẦN. Token dùng-một-lần: gọi lần 2 sẽ lỗi
// "token không hợp lệ" → trước đây gây kẹt spinner / báo lỗi dù đã xác thực thành công.
const attemptedTokens = new Set<string>()

// Trang mở từ link trong email: ?token=... → gọi API xác thực đúng 1 lần.
export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, updateUser } = useAuth()

  const mutation = useMutation({
    mutationFn: () => verifyEmailApi(token),
    onSuccess: () => {
      // Đang đăng nhập → cập nhật cờ verified ngay để banner nhắc biến mất, khỏi cần F5
      if (user) updateUser({ ...user, email_verified: true })
    },
  })

  useEffect(() => {
    // Bỏ qua nếu: thiếu token · token này đã thử rồi · user đang đăng nhập & đã xác minh sẵn
    if (!token || attemptedTokens.has(token) || user?.email_verified) return
    attemptedTokens.add(token)
    mutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Đã xác minh sẵn (vd bấm lại link cũ khi đang đăng nhập) → coi như thành công, KHÔNG kẹt
  const verified = mutation.isSuccess || user?.email_verified === true

  return (
    <AuthLayout title="Xác thực email">
      {!token ? (
        <div className="alert alert-error text-sm">Liên kết không hợp lệ (thiếu mã xác thực).</div>
      ) : verified ? (
        <>
          <div className="alert alert-success text-sm">Xác thực email thành công 🎉</div>
          <Link to="/" className="btn btn-primary mt-3 w-full">
            Về trang chủ
          </Link>
        </>
      ) : mutation.isError ? (
        <>
          <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
          <p className="text-sm text-base-content/70 mt-2">
            Liên kết có thể đã hết hạn hoặc đã dùng. Đăng nhập rồi bấm "Gửi lại email" trên dải nhắc.
          </p>
          <Link to="/" className="btn btn-ghost mt-3 w-full">
            Về trang chủ
          </Link>
        </>
      ) : (
        <p className="flex items-center gap-2">
          <span className="loading loading-spinner loading-sm" /> Đang xác thực...
        </p>
      )}
    </AuthLayout>
  )
}
