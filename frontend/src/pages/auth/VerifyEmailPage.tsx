import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmailApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

// Trang mở từ link trong email: ?token=... → gọi API xác thực đúng 1 lần.
export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, updateUser } = useAuth()

  const mutation = useMutation({
    mutationFn: () => verifyEmailApi(token),
    onSuccess: () => {
      // Đang đăng nhập → cập nhật cờ verified ngay để banner biến mất, khỏi cần F5
      if (user) updateUser({ ...user, email_verified: true })
    },
  })

  // Gọi xác thực ĐÚNG MỘT LẦN khi vào trang. Token dùng một lần nên gọi lần 2 sẽ 400 →
  // ref guard chống StrictMode (dev) gọi đôi. Đây là side-effect hợp lệ (gọi API theo
  // tham số URL lúc tải trang), không phải set-state-in-effect.
  const started = useRef(false)
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    mutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="py-16 px-4">
      <div className="card bg-base-100 shadow max-w-md mx-auto">
        <div className="card-body text-center">
          <h1 className="card-title text-2xl mx-auto">Xác thực email</h1>

          {!token && <div className="alert alert-error text-sm">Liên kết không hợp lệ (thiếu mã xác thực).</div>}

          {token && mutation.isPending && (
            <p className="flex items-center justify-center gap-2">
              <span className="loading loading-spinner loading-sm" /> Đang xác thực...
            </p>
          )}

          {mutation.isSuccess && (
            <>
              <div className="alert alert-success text-sm">Xác thực email thành công 🎉</div>
              <Link to="/" className="btn btn-primary mt-2">
                Về trang chủ
              </Link>
            </>
          )}

          {mutation.isError && (
            <>
              <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
              <p className="text-sm text-base-content/70 mt-1">
                Liên kết có thể đã hết hạn hoặc đã dùng. Đăng nhập rồi bấm "Gửi lại email" trên dải nhắc.
              </p>
              <Link to="/" className="btn btn-ghost mt-2">
                Về trang chủ
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
