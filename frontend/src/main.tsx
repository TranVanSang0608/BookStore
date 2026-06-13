import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRoutes from './routes'
import { AuthProvider } from './store/AuthContext'
import { CartProvider } from './store/CartContext'

// React Query quản lý "server state" (dữ liệu từ API),
// AuthProvider quản lý "client state" về phiên đăng nhập (user + token),
// CartProvider quản lý giỏ hàng 2 chế độ (guest localStorage / user DB) —
// phải nằm TRONG AuthProvider vì cần biết isLoggedIn để chọn chế độ
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
