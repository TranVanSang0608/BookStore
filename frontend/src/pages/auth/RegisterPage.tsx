import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { registerFormSchema, zodErrorsToMap } from '../../lib/validation'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { login } = useAuth()
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

  // 1 hàm set chung cho mọi input — tránh viết 5 hàm onChange gần giống nhau
  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = registerFormSchema.safeParse(form)
    if (!result.success) {
      setFieldErrors(zodErrorsToMap(result.error))
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
    hint?: string
  }> = [
    { key: 'name', label: 'Họ và tên', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Số điện thoại (không bắt buộc)', type: 'tel' },
    { key: 'password', label: 'Mật khẩu', type: 'password', hint: 'Ít nhất 8 ký tự' },
    { key: 'confirm_password', label: 'Nhập lại mật khẩu', type: 'password' },
  ]

  return (
    <div className="py-16 px-4">
      <div className="card bg-base-100 shadow max-w-md mx-auto">
        <div className="card-body">
          <h1 className="card-title text-2xl">Đăng ký tài khoản</h1>

          {mutation.isError && (
            <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {fields.map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={f.key}>
                  {f.label}
                </label>
                <input
                  id={f.key}
                  type={f.type}
                  className="input input-bordered w-full"
                  value={form[f.key]}
                  onChange={setField(f.key)}
                />
                {fieldErrors[f.key] ? (
                  <p className="text-error text-sm mt-1">{fieldErrors[f.key]}</p>
                ) : (
                  f.hint && <p className="text-base-content/60 text-sm mt-1">{f.hint}</p>
                )}
              </div>
            ))}

            <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
              {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
              Đăng ký
            </button>
          </form>

          <p className="text-sm text-center mt-2">
            Đã có tài khoản?{' '}
            <Link to="/login" className="link link-primary">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
