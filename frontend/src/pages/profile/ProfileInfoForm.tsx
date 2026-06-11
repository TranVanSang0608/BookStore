import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { updateProfileApi } from '../../api/user'
import { profileFormSchema, zodErrorsToMap } from '../../lib/validation'
import { useAuth } from '../../store/AuthContext'

export default function ProfileInfoForm() {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: updateProfileApi,
    // Cập nhật context + localStorage → navbar "Xin chào, ..." đổi theo ngay
    onSuccess: (updated) => updateUser(updated),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = profileFormSchema.safeParse({ name, phone })
    if (!result.success) {
      setFieldErrors(zodErrorsToMap(result.error))
      return
    }
    setFieldErrors({})
    mutation.mutate({ name: result.data.name, phone: result.data.phone || undefined })
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Thông tin tài khoản</h2>

        {mutation.isSuccess && <div className="alert alert-success text-sm">Đã lưu thay đổi</div>}
        {mutation.isError && (
          <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label className="label">Email (không thể thay đổi)</label>
            <input className="input input-bordered w-full" value={user?.email ?? ''} disabled />
          </div>

          <div>
            <label className="label" htmlFor="profile_name">
              Họ và tên
            </label>
            <input
              id="profile_name"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && <p className="text-error text-sm mt-1">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="profile_phone">
              Số điện thoại
            </label>
            <input
              id="profile_phone"
              type="tel"
              className="input input-bordered w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {fieldErrors.phone && <p className="text-error text-sm mt-1">{fieldErrors.phone}</p>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
            Lưu thay đổi
          </button>
        </form>
      </div>
    </div>
  )
}
