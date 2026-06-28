import { Moon, Sun } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useTheme } from '../lib/theme'
import Logo from './Logo'

// Layout khu quản trị: khung RIÊNG (không dùng Navbar/Footer marketing) —
// thanh top riêng + sidebar trái. NavLink tự thêm class "active" cho mục đang mở.
export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  useDocumentTitle('Quản trị')

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      {/* Thanh top riêng của khu quản trị */}
      <header className="bg-base-100 border-b border-base-300">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" aria-label="Ánh Sách - trang chủ" className="shrink-0">
            <Logo size={28} />
          </Link>
          <span className="badge badge-neutral badge-sm">Khu quản trị</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Chuyển giao diện sáng/tối"
              className="btn btn-ghost btn-sm btn-circle"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/" className="btn btn-ghost btn-sm">
              Về cửa hàng
            </Link>
            {user && <span className="text-sm hidden sm:inline">{user.name}</span>}
            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Thân: sidebar + nội dung */}
      {/* Mobile: menu NGANG gọn (tự xuống dòng) ở đầu trang → vào thẳng nội dung, không tốn cả màn hình.
          Từ lg: sidebar DỌC bên trái, DÍNH (sticky) khi cuộn để luôn thấy menu. */}
      <div className="max-w-6xl mx-auto w-full p-4 flex flex-col lg:flex-row gap-4 lg:items-start flex-1">
        <ul className="menu bg-base-100 rounded-box shadow w-full lg:w-48 lg:shrink-0 flex-row flex-wrap lg:flex-col lg:sticky lg:top-4">
          <li className="menu-title hidden lg:block">Quản trị</li>
          <li>
            {/* `end` để chỉ active khi đúng /admin (không active khi ở /admin/orders...) */}
            <NavLink to="/admin" end>
              Tổng quan
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/orders">Đơn hàng</NavLink>
          </li>
          <li>
            <NavLink to="/admin/books">Sách</NavLink>
          </li>
          <li>
            <NavLink to="/admin/categories">Thể loại</NavLink>
          </li>
          <li>
            <NavLink to="/admin/authors">Tác giả</NavLink>
          </li>
          <li>
            <NavLink to="/admin/vouchers">Mã giảm giá</NavLink>
          </li>
          <li>
            <NavLink to="/admin/shipping">Phí vận chuyển</NavLink>
          </li>
          <li>
            <NavLink to="/admin/settings">Thông tin shop</NavLink>
          </li>
        </ul>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
