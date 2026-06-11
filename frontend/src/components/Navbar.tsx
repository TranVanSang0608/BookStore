import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/') // về trang chủ sau khi đăng xuất
  }

  return (
    <div className="navbar bg-base-100 shadow">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          📚 BookStore
        </Link>
      </div>
      <div className="flex-none gap-2 px-2">
        {isLoggedIn ? (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost">
              Xin chào, {user!.name}
            </div>
            <ul
              tabIndex={0}
              className="menu dropdown-content bg-base-100 rounded-box shadow w-52 mt-2 z-10"
            >
              <li>
                <Link to="/profile">Tài khoản của tôi</Link>
              </li>
              <li>
                <button onClick={handleLogout}>Đăng xuất</button>
              </li>
            </ul>
          </div>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">
              Đăng nhập
            </Link>
            <Link to="/register" className="btn btn-primary">
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
