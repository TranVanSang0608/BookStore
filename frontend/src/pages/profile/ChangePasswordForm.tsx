import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { changePasswordApi } from '../../api/user'
import PasswordInput from '../../components/PasswordInput'
import { useAuth } from '../../hooks/useAuth'
import { changePasswordFormSchema, focusFirstError, zodErrorsToMap } from '../../lib/validation'

const EMPTY = { current_password: '', new_password: '', confirm_new_password: '' }

export default function ChangePasswordForm() {
  const { updateToken } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: (token) => {
      // Backend cấp token mới (token cũ đã bị vô hiệu) → thay ngay để không bị đăng xuất
      updateToken(token)
      setForm(EMPTY) // đổi xong xóa trắng form
    },
  })

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = changePasswordFormSchema.safeParse(form)
    if (!result.success) {
      const errors = zodErrorsToMap(result.error)
      setFieldErrors(errors)
      focusFirstError(['current_password', 'new_password', 'confirm_new_password'], errors)
      return
    }
    setFieldErrors({})
    // confirm_new_password chỉ kiểm tra ở FE — backend không cần biết
    mutation.mutate({
      current_password: result.data.current_password,
      new_password: result.data.new_password,
    })
  }

  const fields: Array<{ key: keyof typeof form; label: string; autoComplete: string; hint?: string }> = [
    { key: 'current_password', label: 'Mật khẩu hiện tại', autoComplete: 'current-password' },
    { key: 'new_password', label: 'Mật khẩu mới', autoComplete: 'new-password', hint: 'Ít nhất 8 ký tự, khác mật khẩu hiện tại' },
    { key: 'confirm_new_password', label: 'Nhập lại mật khẩu mới', autoComplete: 'new-password' },
  ]

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <h2 className="card-title font-serif">Đổi mật khẩu</h2>

        {mutation.isSuccess && (
          <div className="alert alert-success text-sm">Đổi mật khẩu thành công</div>
        )}
        {mutation.isError && (
          <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label" htmlFor={f.key}>
                {f.label}
              </label>
              <PasswordInput
                id={f.key}
                autoComplete={f.autoComplete}
                value={form[f.key]}
                onChange={setField(f.key)}
              />
              {fieldErrors[f.key] ? (
                <p className="text-error text-sm mt-1">{fieldErrors[f.key]}</p>
              ) : (
                f.hint && <p className="text-base-content/70 text-sm mt-1">{f.hint}</p>
              )}
            </div>
          ))}

          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
            Đổi mật khẩu
          </button>
        </form>
      </div>
    </div>
  )
}
