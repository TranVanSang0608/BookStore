import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { resendVerificationApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'

// Khoá nhớ "đã đóng banner" trong phiên này (sessionStorage = quên khi đóng tab,
// để lần mở app sau vẫn nhắc lại — tránh user quên xác thực vĩnh viễn).
const DISMISS_KEY = 'emailBannerDismissed'

// Dải nhắc "email chưa xác thực" — hiện trên mọi trang khi user đã đăng nhập nhưng
// email_verified = false. Cũng đóng vai trò "nhắc kiểm tra email" ngay sau khi đăng ký.
export default function EmailVerifyBanner() {
  const { user } = useAuth()
  const location = useLocation()
  const mutation = useMutation({ mutationFn: resendVerificationApi })
  // Đọc 1 lần lúc mount: trong phiên này user đã bấm × chưa?
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const isPaymentReturn =
    location.pathname.startsWith('/orders/') && new URLSearchParams(location.search).has('payment')

  // Ẩn nếu: chưa login, đã xác thực, user đã chủ động đóng trong phiên,
  // hoặc đang ở trang kết quả VNPay để thông báo thanh toán không bị lấn.
  if (!user || user.email_verified || dismissed || isPaymentReturn) return null

  return (
    <div className="bg-warning/15 border-b border-warning/30">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
        <span>📧 Email của bạn chưa được xác thực — kiểm tra hộp thư để hoàn tất.</span>
        {mutation.isSuccess ? (
          <span className="text-success font-medium">Đã gửi lại email xác thực!</span>
        ) : (
          <button
            className="btn btn-xs btn-warning"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <span className="loading loading-spinner loading-xs" />}
            Gửi lại email
          </button>
        )}
        {mutation.isError && (
          <span className="text-error">{getApiErrorMessage(mutation.error)}</span>
        )}
        {/* Nút đóng — đẩy sang phải bằng ml-auto */}
        <button
          onClick={dismiss}
          aria-label="Đóng thông báo"
          className="btn btn-ghost btn-xs btn-circle ml-auto"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
