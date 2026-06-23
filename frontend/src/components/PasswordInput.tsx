import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

interface Props {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
  placeholder?: string
}

// Ô nhập mật khẩu kèm nút con mắt hiện/ẩn. Tách riêng để Login/Register/Reset/Đổi mật khẩu
// dùng chung, không lặp logic show/hide. Nút type="button" để không submit form khi bấm.
export default function PasswordInput({ id, value, onChange, autoComplete, placeholder }: Props) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="input input-bordered w-full pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/70 hover:text-base-content"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
