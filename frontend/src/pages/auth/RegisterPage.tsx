import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { registerApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'
import GoogleLoginButton from '../../components/GoogleLoginButton'
import PasswordInput from '../../components/PasswordInput'
import { useAuth } from '../../hooks/useAuth'
import { focusFirstError, registerFormSchema, zodErrorsToMap } from '../../lib/validation'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { login, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: registerApi,
    // backend cấp token ngay khi đăng ký — không bắt login lại.
    // await login để merge giỏ guest xong rồi mới navigate (xem LoginPage)
    onSuccess: async (data) => {
      await login(data)
      navigate('/')
    },
  })

  // Đã đăng nhập rồi thì không cần đăng ký nữa → về trang chủ
  if (isLoggedIn) return <Navigate to="/" replace />

  // 1 hàm set chung cho mọi input — tránh viết 5 hàm onChange gần giống nhau
  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = registerFormSchema.safeParse(form)
    if (!result.success) {
      const errors = zodErrorsToMap(result.error)
      setFieldErrors(errors)
      focusFirstError(['name', 'email', 'phone', 'password', 'confirm_password'], errors)
      return
    }
    setFieldErrors({})
    const { name, email, phone, password } = result.data
    // confirm_password chỉ để kiểm tra ở FE; phone rỗng thì không gửi
    mutation.mutate({ name, email, password, phone: phone || undefined })
  }

  const fields: Array<{
    key: keyof typeof form
    label: string
    type: string
    autoComplete: string
    hint?: string
  }> = [
    { key: 'name', label: 'Họ và tên', type: 'text', autoComplete: 'name' },
    { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
    { key: 'phone', label: 'Số điện thoại (không bắt buộc)', type: 'tel', autoComplete: 'tel' },
    { key: 'password', label: 'Mật khẩu', type: 'password', autoComplete: 'new-password', hint: 'Ít nhất 8 ký tự' },
    { key: 'confirm_password', label: 'Nhập lại mật khẩu', type: 'password', autoComplete: 'new-password' },
  ]

  return (
    <AuthLayout title="Đăng ký tài khoản">
      {mutation.isError && (
        <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label" htmlFor={f.key}>
              {f.label}
            </label>
            {f.type === 'password' ? (
              <PasswordInput
                id={f.key}
                autoComplete={f.autoComplete}
                value={form[f.key]}
                onChange={setField(f.key)}
              />
            ) : (
              <input
                id={f.key}
                type={f.type}
                autoComplete={f.autoComplete}
                className="input input-bordered w-full"
                value={form[f.key]}
                onChange={setField(f.key)}
              />
            )}
            {fieldErrors[f.key] ? (
              <p className="text-error text-sm mt-1">{fieldErrors[f.key]}</p>
            ) : (
              f.hint && <p className="text-base-content/70 text-sm mt-1">{f.hint}</p>
            )}
          </div>
        ))}

        <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
          Đăng ký
        </button>
      </form>

      <div className="divider text-sm">hoặc</div>
      <GoogleLoginButton from="/" />

      <p className="text-sm text-center mt-2">
        Đã có tài khoản?{' '}
        <Link to="/login" className="link link-primary">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
