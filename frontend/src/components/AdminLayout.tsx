import { NavLink, Outlet } from 'react-router-dom'

// Layout khu quản trị: sidebar menu trái + nội dung phải.
// NavLink tự thêm class "active" (DaisyUI tô đậm) cho mục đang mở.
export default function AdminLayout() {
  return (
    <div className="max-w-6xl mx-auto p-4 flex gap-4 items-start">
      <ul className="menu bg-base-100 rounded-box shadow w-48 shrink-0">
        <li className="menu-title">Quản trị</li>
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
      </ul>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
