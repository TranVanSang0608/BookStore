import { Link } from 'react-router-dom'
import Logo from './Logo'

// Footer chung (Giai đoạn B3): 4 cột + tagline + dòng bản quyền.
// Dùng nền xanh đậm (neutral) nên Logo truyền tone="light" để nét/chữ sáng, không bị chìm.
export default function Footer() {
  return (
    <footer className="bg-neutral text-neutral-content/80">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        {/* Cột thương hiệu */}
        <div>
          <Logo variant="full" tone="light" size={30} />
          <p className="text-sm leading-relaxed mt-3 text-neutral-content/70 max-w-xs">
            Sáng trí tuệ • Mở tương lai. Hiệu sách trực tuyến với hàng nghìn đầu sách văn học, kinh
            tế, kỹ năng và thiếu nhi.
          </p>
          <div className="flex gap-2 mt-4">
            <a
              href="#"
              aria-label="Facebook"
              className="w-9 h-9 rounded-lg bg-neutral-content/10 hover:bg-neutral-content/20 flex items-center justify-center text-sm font-semibold text-accent"
            >
              f
            </a>
            <a
              href="#"
              aria-label="YouTube"
              className="w-9 h-9 rounded-lg bg-neutral-content/10 hover:bg-neutral-content/20 flex items-center justify-center text-sm font-semibold text-accent"
            >
              ▶
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="w-9 h-9 rounded-lg bg-neutral-content/10 hover:bg-neutral-content/20 flex items-center justify-center text-sm font-semibold text-accent"
            >
              ig
            </a>
          </div>
        </div>

        {/* Cột Khám phá — chỉ link tới trang thật */}
        <div>
          <h3 className="font-semibold text-neutral-content mb-3">Khám phá</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-neutral-content">
                Trang chủ
              </Link>
            </li>
            <li>
              <Link to="/books" className="hover:text-neutral-content">
                Tất cả sách
              </Link>
            </li>
            <li>
              <Link to="/wishlist" className="hover:text-neutral-content">
                Sách yêu thích
              </Link>
            </li>
          </ul>
        </div>

        {/* Cột Hỗ trợ — chỉ link tới trang thật */}
        <div>
          <h3 className="font-semibold text-neutral-content mb-3">Hỗ trợ</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/orders" className="hover:text-neutral-content">
                Theo dõi đơn hàng
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-neutral-content">
                Giỏ hàng
              </Link>
            </li>
            <li>
              <Link to="/profile" className="hover:text-neutral-content">
                Tài khoản của tôi
              </Link>
            </li>
          </ul>
        </div>

        {/* Cột Liên hệ */}
        <div>
          <h3 className="font-semibold text-neutral-content mb-3">Liên hệ</h3>
          <p className="text-sm leading-relaxed">
            Hotline: 1900 1234
            <br />
            hello@anhsach.vn
            <br />
            123 Lê Lợi, Q.1, TP.HCM
          </p>
          <div className="flex gap-2 mt-3">
            <span className="badge badge-outline border-neutral-content/30">COD</span>
            <span className="badge badge-outline border-neutral-content/30">VNPay</span>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-content/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between gap-2 text-xs text-neutral-content/60">
          <span>© 2026 Ánh Sách. Bảo lưu mọi quyền.</span>
          <span className="flex gap-4">
            <a href="#" className="hover:text-neutral-content">
              Điều khoản
            </a>
            <a href="#" className="hover:text-neutral-content">
              Bảo mật
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
