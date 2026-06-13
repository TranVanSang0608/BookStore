import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { PublicUser } from '../api/auth'
import { mergeCartApi } from '../api/cart'
import { AuthContext } from '../hooks/useAuth'
import {
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
  type StoredAuth,
} from './authStorage'
import { clearGuestCart, loadGuestCart } from './cartStorage'

// "Client state" về phiên đăng nhập — khác với "server state" do React Query quản.
// File này CHỈ export component AuthProvider (quy tắc Fast Refresh);
// context object + hook useAuth nằm ở hooks/useAuth.ts.

export function AuthProvider({ children }: { children: ReactNode }) {
  // useState(hàm): chỉ đọc localStorage MỘT lần lúc khởi tạo, không phải mỗi render —
  // nhờ vậy F5 trang vẫn giữ phiên đăng nhập
  const [auth, setAuth] = useState<StoredAuth | null>(loadStoredAuth)

  // AuthProvider nằm trong QueryClientProvider (xem main.tsx) nên dùng được queryClient.
  // queryClient.clear() khi đổi phiên: xóa sạch cache React Query để dữ liệu riêng tư
  // của tài khoản trước (địa chỉ, sau này là giỏ hàng/đơn hàng) không lóe sang tài khoản sau.
  const queryClient = useQueryClient()

  const login = async (next: StoredAuth) => {
    queryClient.clear() // gọi cả ở login: cover trường hợp đổi tài khoản mà không bấm logout
    saveStoredAuth(next)
    setAuth(next)

    // Merge guest cart vào DB cart — đặt ở ĐÂY để phủ cả 2 đường vào:
    // LoginPage lẫn RegisterPage đều gọi login(). Gọi SAU saveStoredAuth để interceptor
    // đã có token. AWAIT merge xong rồi trang mới navigate → checkout/giỏ không bao giờ
    // thấy "rỗng tạm thời" vì điều hướng tới trước khi merge kịp ghi.
    // Thành công → dọn guest cart + GHI THẲNG kết quả vào cache (setQueryData) nên
    //   trang đích hiển thị giỏ đầy đủ ngay, không cần đợi refetch.
    // Thất bại (mất mạng...) → nuốt lỗi, GIỮ NGUYÊN guest cart trong localStorage:
    //   user không mất hàng, lần đăng nhập sau merge lại (merge max(qty) là idempotent).
    const guestItems = loadGuestCart()
    if (guestItems.length > 0) {
      try {
        const merged = await mergeCartApi(guestItems)
        clearGuestCart()
        queryClient.setQueryData(['cart'], merged)
      } catch {
        /* giữ guest cart cho lần sau — không có gì phải làm thêm */
      }
    }
  }

  const logout = () => {
    clearStoredAuth()
    setAuth(null)
    queryClient.clear()
  }

  // Sau khi PUT /users/me thành công, đồng bộ user mới vào context + localStorage
  // (giữ nguyên token) — navbar "Xin chào, ..." tự cập nhật theo
  const updateUser = (user: PublicUser) => {
    setAuth((prev) => {
      if (!prev) return prev
      const next = { ...prev, user }
      saveStoredAuth(next)
      return next
    })
  }

  return (
    <AuthContext.Provider
      value={{ user: auth?.user ?? null, isLoggedIn: auth !== null, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}
