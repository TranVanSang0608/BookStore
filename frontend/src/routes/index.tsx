import { Route, Routes } from 'react-router-dom'
import HomePage from '../pages/home/HomePage'

// Khai báo route tập trung — các phase sau thêm route mới vào đây
// (/books, /cart, /checkout, /admin...)
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}
