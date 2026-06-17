import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import Layout from '../components/Layout'
import RequireAdmin from '../components/RequireAdmin'
import RequireAuth from '../components/RequireAuth'
import AdminAuthorsPage from '../pages/admin/AdminAuthorsPage'
import AdminBookFormPage from '../pages/admin/AdminBookFormPage'
import AdminBooksPage from '../pages/admin/AdminBooksPage'
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage'
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage'
import AdminOrdersPage from '../pages/admin/AdminOrdersPage'
import AdminVouchersPage from '../pages/admin/AdminVouchersPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'
import VerifyEmailPage from '../pages/auth/VerifyEmailPage'
import AuthorPage from '../pages/books/AuthorPage'
import BookDetailPage from '../pages/books/BookDetailPage'
import BookListPage from '../pages/books/BookListPage'
import CartPage from '../pages/cart/CartPage'
import CheckoutPage from '../pages/checkout/CheckoutPage'
import OrderDetailPage from '../pages/orders/OrderDetailPage'
import OrdersPage from '../pages/orders/OrdersPage'
import HomePage from '../pages/home/HomePage'
import ProfilePage from '../pages/profile/ProfilePage'
import WishlistPage from '../pages/wishlist/WishlistPage'

// Khai báo route tập trung. Route cha <Layout> render navbar chung,
// các trang con hiện vào vị trí <Outlet/> bên trong Layout.
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/books" element={<BookListPage />} />
        <Route path="/books/:slug" element={<BookDetailPage />} />
        <Route path="/author/:id" element={<AuthorPage />} />
        {/* Giỏ hàng KHÔNG cần đăng nhập (D2 — guest cart); checkout mới bắt buộc */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Phase 6 — xác thực email + quên/đặt lại mật khẩu (đều công khai) */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        {/* Checkout bắt buộc đăng nhập (D2) — guest từ /cart sẽ qua /login rồi quay lại đây */}
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        {/* Lịch sử đơn + chi tiết của user — getOrderByCode chặn xem đơn người khác (404) */}
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:code"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        {/* Sách yêu thích (Phase 8) — dữ liệu riêng của user */}
        <Route
          path="/wishlist"
          element={
            <RequireAuth>
              <WishlistPage />
            </RequireAuth>
          }
        />

        {/* Khu quản trị: route lồng nhau — AdminLayout render sidebar,
            trang con hiện vào <Outlet/>. RequireAdmin chặn user thường. */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/orders" replace />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="books" element={<AdminBooksPage />} />
          <Route path="books/new" element={<AdminBookFormPage />} />
          <Route path="books/:id/edit" element={<AdminBookFormPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="authors" element={<AdminAuthorsPage />} />
          <Route path="vouchers" element={<AdminVouchersPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
