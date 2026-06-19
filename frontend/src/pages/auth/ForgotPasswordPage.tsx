import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { forgotPasswordApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'

// Trang quên mật khẩu: nhập email → backend gửi link đặt lại.
// Backend LUÔN trả thông báo chung (chống dò tài khoản) nên FE chỉ hiện message thành công.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  const mutation = useMutation({ mutationFn: forgotPasswordApi })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = z.email('Email không hợp lệ').safeParse(email.trim())
    if (!result.success) {
      setEmailError('Email không hợp lệ')
      return
    }
    setEmailError('')
    mutation.mutate(result.data)
  }

  return (
    <AuthLayout title="Quên mật khẩu">
      {mutation.isSuccess ? (
        <div className="alert alert-success text-sm">{mutation.data.message}</div>
      ) : (
        <>
          <p className="text-sm text-base-content/70">
            Nhập email tài khoản. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu (hết hạn sau 1 giờ).
          </p>

          {mutation.isError && (
            <div className="alert alert-error text-sm mt-3">{getApiErrorMessage(mutation.error)}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 mt-3" noValidate>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailError && <p className="text-error text-sm mt-1">{emailError}</p>}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
              {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
              Gửi liên kết đặt lại
            </button>
          </form>
        </>
      )}

      <p className="text-sm text-center mt-4">
        <Link to="/login" className="link link-primary">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
