import { Route, Routes } from 'react-router-dom'
import Layout from '../components/Layout'
import RequireAuth from '../components/RequireAuth'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import HomePage from '../pages/home/HomePage'
import ProfilePage from '../pages/profile/ProfilePage'

// Khai báo route tập trung. Route cha <Layout> render navbar chung,
// các trang con hiện vào vị trí <Outlet/> bên trong Layout.
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  )
}
