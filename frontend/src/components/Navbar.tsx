import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Heart, Menu, Moon, Search, ShoppingCart, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { fetchCategories } from '../api/categories'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useTheme } from '../lib/theme'
import Logo from './Logo'

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth()
  const { count } = useCart()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Thể loại gần như không đổi trong 1 phiên → cache vô hạn, dùng cho menu "Sách" + dải thể loại
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  })

  function handleLogout() {
    setMobileOpen(false)
    logout()
    navigate('/') // về trang chủ sau khi đăng xuất
  }

  // Tìm kiếm: gom từ khoá vào URL /books?q=... (BookListPage đọc lại từ URL)
  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim()
    setMobileOpen(false)
    navigate(q ? `/books?q=${encodeURIComponent(q)}` : '/books')
  }

  return (
    <header className="bg-base-100 border-b border-base-300">
      {/* ===== Thanh utility (ẩn trên mobile) ===== */}
      <div className="hidden md:block bg-neutral text-neutral-content/85 text-xs">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <span>Miễn phí giao hàng cho đơn từ 300.000đ</span>
          <div className="flex items-center gap-4">
            <span>Hotline: 1900 1234</span>
            <Link to="/orders" className="hover:text-neutral-content">
              Tra cứu đơn hàng
            </Link>
            <button
              onClick={toggle}
              aria-label="Chuyển giao diện sáng/tối"
              className="w-7 h-7 rounded-full border border-neutral-content/30 flex items-center justify-center hover:bg-neutral-content/10"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Thanh chính ===== */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 md:gap-5">
        <Link to="/" aria-label="Ánh Sách - trang chủ" className="shrink-0">
          <Logo size={32} />
        </Link>

        {/* Menu "Sách" — đổ từ thể loại thật (desktop) */}
        <div className="dropdown dropdown-bottom hidden md:block">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-1 font-semibold">
            Sách <ChevronDown size={16} />
          </div>
          <ul
            tabIndex={0}
            className="menu dropdown-content bg-base-100 rounded-box shadow w-56 mt-2 z-40 max-h-96 flex-nowrap overflow-y-auto"
          >
            {(categories ?? []).filter((c) => (c.book_count ?? 0) > 0).map((c) => (
              <li key={c.id}>
                <Link to={`/books?category=${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Ô tìm kiếm (desktop) */}
        <form
          role="search"
          onSubmit={handleSearch}
          className="flex-1 hidden md:flex items-center gap-2 bg-base-200 border border-base-300 rounded-full px-4 py-2 max-w-xl"
        >
          <Search size={17} className="text-base-content/50 shrink-0" />
          <input
            name="q"
            aria-label="Tìm sách"
            placeholder="Tìm tên sách, tác giả, thể loại…"
            className="bg-transparent outline-none w-full text-sm"
          />
        </form>

        {/* Nhóm icon bên phải */}
        <div className="flex items-center gap-1 md:gap-2 ml-auto">
          <Link
            to="/wishlist"
            aria-label="Sách yêu thích"
            className="btn btn-ghost btn-circle btn-sm hidden md:inline-flex"
          >
            <Heart size={20} />
          </Link>
          <Link
            to="/cart"
            aria-label="Giỏ hàng"
            className="btn btn-ghost btn-circle btn-sm indicator"
          >
            {count > 0 && (
              <span className="indicator-item badge badge-primary badge-xs">{count}</span>
            )}
            <ShoppingCart size={20} />
          </Link>

          {/* Tài khoản (desktop) */}
          {isLoggedIn ? (
            <div className="dropdown dropdown-end hidden md:block">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2 pl-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-semibold">
                  {user!.name.charAt(0).toUpperCase()}
                </span>
                <ChevronDown size={14} className="text-base-content/60" />
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content bg-base-100 rounded-box shadow w-52 mt-2 z-40"
              >
                {/* Mục Quản trị chỉ hiện với admin — backend vẫn là lớp chặn thật (adminOnly) */}
                {user!.role === 'admin' && (
                  <li>
                    <Link to="/admin">Quản trị</Link>
                  </li>
                )}
                <li>
                  <Link to="/orders">Đơn hàng của tôi</Link>
                </li>
                <li>
                  <Link to="/wishlist">Sách yêu thích</Link>
                </li>
                <li>
                  <Link to="/profile">Tài khoản của tôi</Link>
                </li>
                <li>
                  <button onClick={handleLogout}>Đăng xuất</button>
                </li>
              </ul>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Đăng ký
              </Link>
            </div>
          )}

          {/* Nút hamburger (chỉ mobile) */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Mở menu"
            aria-expanded={mobileOpen}
            className="btn btn-ghost btn-circle btn-sm md:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ===== Dải thể loại nhanh (desktop) ===== */}
      <nav aria-label="Thể loại" className="hidden md:block border-t border-base-300/70">
        <div className="max-w-6xl mx-auto px-4 flex gap-5 text-sm overflow-x-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `py-2.5 whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-base-content/70 hover:text-primary'
              }`
            }
          >
            Trang chủ
          </NavLink>
          {(categories ?? []).filter((c) => (c.book_count ?? 0) > 0).slice(0, 7).map((c) => (
            <Link
              key={c.id}
              to={`/books?category=${c.slug}`}
              className="py-2.5 whitespace-nowrap border-b-2 border-transparent text-base-content/70 hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* ===== Menu mobile (mở bằng hamburger) ===== */}
      {mobileOpen && (
        <div className="md:hidden border-t border-base-300 bg-base-100 px-4 py-4 space-y-4">
          {/* Tìm kiếm */}
          <form
            role="search"
            onSubmit={handleSearch}
            className="flex items-center gap-2 bg-base-200 border border-base-300 rounded-full px-4 py-2"
          >
            <Search size={17} className="text-base-content/50 shrink-0" />
            <input
              name="q"
              aria-label="Tìm sách"
              placeholder="Tìm tên sách, tác giả…"
              className="bg-transparent outline-none w-full text-sm"
            />
          </form>

          {/* Chuyển sáng/tối */}
          <button
            onClick={toggle}
            className="btn btn-ghost btn-sm w-full justify-start gap-2"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
          </button>

          {/* Thể loại */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">
              Thể loại
            </div>
            <div className="flex flex-wrap gap-2">
              {(categories ?? []).filter((c) => (c.book_count ?? 0) > 0).map((c) => (
                <Link
                  key={c.id}
                  to={`/books?category=${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="badge badge-lg badge-ghost"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Tài khoản */}
          <ul className="menu p-0 border-t border-base-300 pt-3">
            <li>
              <Link to="/wishlist" onClick={() => setMobileOpen(false)}>
                Sách yêu thích
              </Link>
            </li>
            {isLoggedIn ? (
              <>
                {user!.role === 'admin' && (
                  <li>
                    <Link to="/admin" onClick={() => setMobileOpen(false)}>
                      Quản trị
                    </Link>
                  </li>
                )}
                <li>
                  <Link to="/orders" onClick={() => setMobileOpen(false)}>
                    Đơn hàng của tôi
                  </Link>
                </li>
                <li>
                  <Link to="/profile" onClick={() => setMobileOpen(false)}>
                    Tài khoản của tôi
                  </Link>
                </li>
                <li>
                  <button onClick={handleLogout}>Đăng xuất</button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Đăng nhập
                  </Link>
                </li>
                <li>
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    Đăng ký
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  )
}
