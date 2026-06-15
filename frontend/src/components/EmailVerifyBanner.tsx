import { useMutation } from '@tanstack/react-query'
import { resendVerificationApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'

// Dải nhắc "email chưa xác thực" — hiện trên mọi trang khi user đã đăng nhập nhưng
// email_verified = false. Cũng đóng vai trò "nhắc kiểm tra email" ngay sau khi đăng ký.
export default function EmailVerifyBanner() {
  const { user } = useAuth()
  const mutation = useMutation({ mutationFn: resendVerificationApi })

  // Derived hoàn toàn từ user — không cần state/effect: verified hoặc chưa login thì ẩn
  if (!user || user.email_verified) return null

  return (
    <div className="bg-warning/15 border-b border-warning/30">
      <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 text-sm">
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
      </div>
    </div>
  )
}
