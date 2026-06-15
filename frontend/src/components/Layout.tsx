import { Outlet } from 'react-router-dom'
import EmailVerifyBanner from './EmailVerifyBanner'
import Navbar from './Navbar'

// Khung chung cho mọi trang: navbar trên cùng + dải nhắc xác thực email (nếu cần)
// + <Outlet/> là chỗ React Router render trang con tương ứng với URL
export default function Layout() {
  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />
      <EmailVerifyBanner />
      <Outlet />
    </div>
  )
}
