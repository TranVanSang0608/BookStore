import { Outlet } from 'react-router-dom'
import ChatWidget from '../features/chat/ChatWidget'
import EmailVerifyBanner from './EmailVerifyBanner'
import Footer from './Footer'
import Navbar from './Navbar'

// Khung chung cho mọi trang: navbar + dải nhắc xác thực email + nội dung trang + footer.
// flex-col + main flex-1 → footer luôn nằm đáy kể cả trang ít nội dung.
export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      {/* Skip-link: ẩn cho tới khi Tab vào → người dùng bàn phím nhảy thẳng tới nội dung */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 btn btn-primary btn-sm"
      >
        Bỏ qua tới nội dung chính
      </a>
      <Navbar />
      <EmailVerifyBanner />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {/* Trợ lý tư vấn sách — nổi góc phải ở trang khách, tự ẩn ở khu /admin */}
      <ChatWidget />
    </div>
  )
}
