import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPasswordApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'
import PasswordInput from '../../components/PasswordInput'
import { focusFirstError, resetPasswordFormSchema, zodErrorsToMap } from '../../lib/validation'

// Trang đặt lại mật khẩu: mở từ link ?token=... → nhập mật khẩu mới.
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirm_password: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => resetPasswordApi(token, form.password),
  })

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = resetPasswordFormSchema.safeParse(form)
    if (!result.success) {
      const errors = zodErrorsToMap(result.error)
      setFieldErrors(errors)
      focusFirstError(['password', 'confirm_password'], errors)
      return
    }
    setFieldErrors({})
    mutation.mutate()
  }

  return (
    <AuthLayout title="Đặt lại mật khẩu">
      {!token ? (
        <div className="alert alert-error text-sm">Liên kết không hợp lệ (thiếu mã đặt lại).</div>
      ) : mutation.isSuccess ? (
        <>
          <div className="alert alert-success text-sm">
            Đổi mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới.
          </div>
          <Link to="/login" className="btn btn-primary mt-3 w-full">
            Đăng nhập
          </Link>
        </>
      ) : (
        <>
          {mutation.isError && (
            <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <label className="label" htmlFor="password">
                Mật khẩu mới
              </label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={form.password}
                onChange={setField('password')}
              />
              {fieldErrors.password ? (
                <p className="text-error text-sm mt-1">{fieldErrors.password}</p>
              ) : (
                <p className="text-base-content/70 text-sm mt-1">Ít nhất 8 ký tự</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="confirm_password">
                Nhập lại mật khẩu mới
              </label>
              <PasswordInput
                id="confirm_password"
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={setField('confirm_password')}
              />
              {fieldErrors.confirm_password && (
                <p className="text-error text-sm mt-1">{fieldErrors.confirm_password}</p>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
              {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
              Đặt lại mật khẩu
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
