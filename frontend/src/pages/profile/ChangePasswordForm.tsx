import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { changePasswordApi } from '../../api/user'
import { changePasswordFormSchema, zodErrorsToMap } from '../../lib/validation'

const EMPTY = { current_password: '', new_password: '', confirm_new_password: '' }

export default function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => setForm(EMPTY), // đổi xong xóa trắng form
  })

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = changePasswordFormSchema.safeParse(form)
    if (!result.success) {
      setFieldErrors(zodErrorsToMap(result.error))
      return
    }
    setFieldErrors({})
    // confirm_new_password chỉ kiểm tra ở FE — backend không cần biết
    mutation.mutate({
      current_password: result.data.current_password,
      new_password: result.data.new_password,
    })
  }

  const fields: Array<{ key: keyof typeof form; label: string }> = [
    { key: 'current_password', label: 'Mật khẩu hiện tại' },
    { key: 'new_password', label: 'Mật khẩu mới' },
    { key: 'confirm_new_password', label: 'Nhập lại mật khẩu mới' },
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
              <input
                id={f.key}
                type="password"
                className="input input-bordered w-full"
                value={form[f.key]}
                onChange={setField(f.key)}
              />
              {fieldErrors[f.key] && (
                <p className="text-error text-sm mt-1">{fieldErrors[f.key]}</p>
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
