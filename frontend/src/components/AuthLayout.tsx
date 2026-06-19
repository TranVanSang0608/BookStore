import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import Logo from './Logo'

// Khung 2 cột dùng chung cho mọi trang xác thực (Login/Register/Forgot/Reset/Verify):
// panel thương hiệu bên trái (ẩn trên mobile) + khu form bên phải.
export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-4 py-10">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 rounded-box overflow-hidden border border-base-300 shadow-sm">
        {/* Panel thương hiệu — ẩn trên màn hình nhỏ */}
        <div className="hidden md:flex flex-col justify-center bg-neutral text-neutral-content p-10">
          <Logo variant="full" tone="light" size={34} />
          <h2 className="font-serif text-2xl mt-6 leading-snug">Sáng trí tuệ • Mở tương lai</h2>
          <p className="text-sm text-neutral-content/70 mt-3">
            Đăng nhập để lưu sách yêu thích, theo dõi đơn hàng và mua sắm nhanh hơn.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-neutral-content/85">
            <li className="flex items-center gap-2">
              <Check size={16} className="text-accent" /> Lưu sách yêu thích
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-accent" /> Theo dõi đơn hàng mọi lúc
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-accent" /> Thanh toán COD &amp; VNPay an toàn
            </li>
          </ul>
        </div>

        {/* Khu form */}
        <div className="bg-base-100 p-8">
          <h1 className="font-serif text-2xl font-semibold text-base-content mb-4">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
