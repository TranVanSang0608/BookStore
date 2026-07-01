import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'
import GoogleLoginButton from '../../components/GoogleLoginButton'
import PasswordInput from '../../components/PasswordInput'
import { useAuth } from '../../hooks/useAuth'
import { focusFirstError, loginFormSchema, zodErrorsToMap } from '../../lib/validation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // RequireAuth đá về đây kèm state.from — login xong quay lại đúng trang đó
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  // useMutation: phiên bản "ghi" của React Query (POST/PUT/DELETE) —
  // cho sẵn isPending để khóa nút, error để hiển thị lỗi từ server
  const mutation = useMutation({
    mutationFn: loginApi,
    // await login: chờ merge giỏ guest xong rồi mới rời trang đăng nhập,
    // để /checkout (hoặc trang from) hiển thị giỏ đã merge ngay, không nhấp nháy rỗng
    onSuccess: async (data) => {
      await login(data)
      navigate(from, { replace: true })
    },
  })

  // Đã đăng nhập rồi mà mở /login → đưa thẳng về trang trước đó (hoặc trang chủ), không hiện form
  if (isLoggedIn) return <Navigate to={from} replace />

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = loginFormSchema.safeParse({ email, password })
    if (!result.success) {
      const errors = zodErrorsToMap(result.error)
      setFieldErrors(errors)
      focusFirstError(['email', 'password'], errors) // nhảy con trỏ tới ô lỗi đầu tiên
      return
    }
    setFieldErrors({})
    mutation.mutate(result.data)
  }

  return (
    <AuthLayout title="Đăng nhập">
      {/* Từ giỏ hàng bấm "Tiến hành đặt hàng" bị đá vào đây (D2: checkout bắt buộc đăng nhập) —
          báo rõ lý do để không cảm giác bị chuyển trang đột ngột */}
      {from === '/checkout' && (
        <div className="alert alert-info text-sm">Đăng nhập để hoàn tất đơn hàng của bạn.</div>
      )}

      {mutation.isError && (
        <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && <p className="text-error text-sm mt-1">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="label" htmlFor="password">
            Mật khẩu
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && <p className="text-error text-sm mt-1">{fieldErrors.password}</p>}
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
          Đăng nhập
        </button>
      </form>

      <div className="divider text-sm">hoặc</div>
      <GoogleLoginButton from={from} />

      <p className="text-sm text-center mt-2">
        <Link to="/forgot-password" className="link">
          Quên mật khẩu?
        </Link>
      </p>

      <p className="text-sm text-center">
        Chưa có tài khoản?{' '}
        <Link to="/register" state={{ from }} className="link link-primary">
          Đăng ký ngay
        </Link>
      </p>
    </AuthLayout>
  )
}
