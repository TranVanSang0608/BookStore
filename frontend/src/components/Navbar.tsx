import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Heart, Menu, Moon, ShoppingCart, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { fetchCategories } from '../api/categories'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'
import { useFreeShipThreshold } from '../hooks/useFreeShipThreshold'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { formatPrice } from '../lib/format'
import { useTheme } from '../lib/theme'
import Logo from './Logo'
import SearchAutocomplete from './SearchAutocomplete'

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth()
  const { count } = useCart()
  const { isDark, toggle } = useTheme()
  const settings = useSiteSettings() // hotline shop (admin sửa được)
  const freeShipThreshold = useFreeShipThreshold() // ngưỡng miễn phí ship (admin sửa ở /admin/shipping)
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

  // Menu mobile là overlay — khóa cuộn nền + đóng bằng Esc khi đang mở
  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen])

  return (
    <header className="bg-base-100 border-b border-base-300">
      {/* ===== Thanh utility (ẩn trên mobile) ===== */}
      <div className="hidden lg:block bg-neutral text-neutral-content/85 text-xs">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 py-2 flex items-center justify-between">
          <span>Miễn phí giao hàng cho đơn từ {formatPrice(freeShipThreshold)}</span>
          <div className="flex items-center gap-4">
            <span>Hotline: {settings.shop_hotline}</span>
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
      <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 py-3 flex items-center gap-3 lg:gap-5">
        <Link to="/" aria-label="Ánh Sách - trang chủ" className="shrink-0">
          <Logo size={32} />
        </Link>

        {/* Ô tìm kiếm có gợi ý (desktop) */}
        <SearchAutocomplete className="flex-1 hidden lg:block max-w-xl" />

        {/* Nhóm icon bên phải */}
        <div className="flex items-center gap-1 lg:gap-2 ml-auto">
          <Link
            to="/wishlist"
            aria-label="Sách yêu thích"
            className="btn btn-ghost btn-circle btn-sm hidden lg:inline-flex"
          >
            <Heart size={20} />
          </Link>
          <Link
            to="/cart"
            aria-label="Giỏ hàng"
            // Mobile/tablet: ép vùng bấm ≥44px; desktop giữ btn-sm gọn.
            className="btn btn-ghost btn-circle btn-sm indicator min-h-11 min-w-11 lg:min-h-0 lg:min-w-0"
          >
            {count > 0 && (
              <span className="indicator-item badge badge-primary badge-xs">{count}</span>
            )}
            <ShoppingCart size={20} />
          </Link>

          {/* Tài khoản (desktop) */}
          {isLoggedIn ? (
            <div className="dropdown dropdown-end hidden lg:block">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2 pl-2">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-semibold">
                  {user!.name.charAt(0).toUpperCase()}
                </span>
                <ChevronDown size={14} className="text-base-content/70" />
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
            <div className="hidden lg:flex items-center gap-2">
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
            // Chỉ hiện trên mobile → vùng bấm ≥44px cho ngón tay
            className="btn btn-ghost btn-circle btn-sm lg:hidden min-h-11 min-w-11"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ===== Dải thể loại nhanh (desktop) ===== */}
      <nav aria-label="Thể loại" className="hidden lg:block border-t border-base-300/70">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 flex gap-5 text-sm overflow-x-auto">
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
          {/* Hiện ĐỦ mọi thể loại (không cắt) — dải có overflow-x-auto nên tự cuộn ngang khi
              thêm thể loại mới; tránh việc thể loại thứ 9+ âm thầm biến mất khỏi nav desktop. */}
          {(categories ?? []).filter((c) => (c.book_count ?? 0) > 0).map((c) => (
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

      {/* ===== Menu mobile (mở bằng hamburger) — overlay có backdrop, đóng bằng Esc/bấm ra ngoài ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-0 max-h-[85vh] overflow-y-auto border-b border-base-300 bg-base-100 px-4 py-4 space-y-4 shadow-lg">
          {/* Tìm kiếm có gợi ý */}
          <SearchAutocomplete onNavigate={() => setMobileOpen(false)} />

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
            <div className="text-xs font-semibold uppercase tracking-wide text-base-content/70 mb-2">
              Thể loại
            </div>
            <div className="flex flex-wrap gap-2">
              {(categories ?? []).filter((c) => (c.book_count ?? 0) > 0).map((c) => (
                <Link
                  key={c.id}
                  to={`/books?category=${c.slug}`}
                  onClick={() => setMobileOpen(false)}
                  // Chip thể loại trong menu mobile: cao ≥44px + bo tròn, dễ chạm hơn badge nhỏ
                  className="inline-flex items-center min-h-11 px-4 rounded-full border border-base-300 text-sm hover:border-primary hover:text-primary"
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
        </div>
      )}
    </header>
  )
}
