import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { initTheme } from './lib/theme'
import AppRoutes from './routes'
import { AuthProvider } from './store/AuthContext'
import { CartProvider } from './store/CartContext'

// Áp theme đã lưu (sáng/tối) trước khi React render để tránh nhấp nháy
initTheme()

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
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
