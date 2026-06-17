import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleLoginApi } from '../api/auth'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../hooks/useAuth'

// Nút "Đăng nhập với Google" (D60). Tự chứa: tải script Google Identity Services 1 lần,
// render nút chính chủ của Google, nhận ID token (credential) rồi gọi backend.
// Dùng chung cho cả LoginPage và RegisterPage — giống cách login() phủ cả 2 đường vào.

// Khai báo tối thiểu kiểu window.google của thư viện GSI (script nạp lúc runtime)
interface GoogleCredentialResponse {
  credential: string
}
interface GoogleIdApi {
  initialize: (config: { client_id: string; callback: (res: GoogleCredentialResponse) => void }) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// Tải script GSI đúng 1 lần cho cả app (trả về Promise dùng chung nếu gọi nhiều lần)
let gsiPromise: Promise<void> | null = null
function loadGsiScript(): Promise<void> {
  if (gsiPromise) return gsiPromise
  gsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      // Xóa cache promise đã reject để lần mount sau thử tải lại được (lỗi mạng tạm thời)
      gsiPromise = null
      script.remove()
      reject(new Error('Không tải được Google script'))
    }
    document.head.appendChild(script)
  })
  return gsiPromise
}

export default function GoogleLoginButton({ from = '/' }: { from?: string }) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  // Giữ handler mới nhất trong ref: callback của GSI chạy NGOÀI React nên nếu bắt trực tiếp
  // biến từ closure sẽ dính giá trị cũ (stale closure). Cập nhật ref trong effect (không phải
  // trong thân render) để hợp quy tắc React.
  const handlerRef = useRef<(credential: string) => void>(() => {})
  useEffect(() => {
    handlerRef.current = async (credential: string) => {
      try {
        const data = await googleLoginApi(credential)
        await login(data) // login() lo merge giỏ guest + lưu localStorage
        navigate(from, { replace: true })
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    }
  })

  useEffect(() => {
    if (!CLIENT_ID) return // thiếu cấu hình → xử lý ở tầng render bên dưới
    let cancelled = false
    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => handlerRef.current(res.credential),
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          locale: 'vi',
        })
      })
      .catch(() => setError('Không tải được đăng nhập Google'))
    return () => {
      cancelled = true
    }
  }, [])

  // Thiếu Client ID → không render nút (derived ở render, không setState trong effect)
  if (!CLIENT_ID) {
    return <p className="text-base-content/50 text-sm text-center">Chưa cấu hình đăng nhập Google</p>
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={buttonRef} />
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  )
}
