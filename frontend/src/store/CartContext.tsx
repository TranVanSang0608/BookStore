import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import {
  addCartItemApi,
  fetchCart,
  removeCartItemApi,
  updateCartItemApi,
} from '../api/cart'
import { useAuth } from '../hooks/useAuth'
import { CartContext } from '../hooks/useCart'
import {
  addLine,
  loadGuestCart,
  removeLine,
  saveGuestCart,
  setLineQty,
  type GuestCartLine,
} from './cartStorage'

// Provider giỏ hàng 2 CHẾ ĐỘ — cùng 1 interface useCart() cho mọi component:
// - Guest: dòng giỏ trong useState, ghi xuyên xuống localStorage mỗi lần đổi
// - Đã đăng nhập: giỏ là server state — useQuery(['cart']) + mutation xong invalidate
// Navbar badge, trang giỏ, nút thêm giỏ... không cần biết đang ở chế độ nào.

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth()
  const queryClient = useQueryClient()

  const [guestLines, setGuestLines] = useState<GuestCartLine[]>(loadGuestCart)

  // Đổi phiên (login/logout) → đọc lại localStorage NGAY TRONG RENDER.
  // Đây là pattern chính thống "adjusting state when props change" của React docs —
  // KHÔNG dùng useEffect + setState (bài học review vòng 2). Cần thiết vì:
  // login xong merge sẽ dọn key guest cart → logout ra phải thấy giỏ guest RỖNG,
  // không phải state cũ còn sót từ trước khi login.
  const [prevLoggedIn, setPrevLoggedIn] = useState(isLoggedIn)
  if (prevLoggedIn !== isLoggedIn) {
    setPrevLoggedIn(isLoggedIn)
    setGuestLines(loadGuestCart())
  }

  // enabled: isLoggedIn — guest không gọi API giỏ (sẽ chỉ nhận 401 vô ích)
  const { data: serverCart } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: isLoggedIn,
  })

  const invalidateCart = () => queryClient.invalidateQueries({ queryKey: ['cart'] })

  // Guest: mọi thay đổi đi qua đây — state đổi là localStorage đổi theo (write-through)
  function setGuest(next: GuestCartLine[]) {
    saveGuestCart(next)
    setGuestLines(next)
  }

  async function addItem(bookId: number, quantity: number, stock: number) {
    if (isLoggedIn) {
      await addCartItemApi(bookId, quantity) // BE chặn vượt tồn — lỗi ném lên caller hiển thị
      invalidateCart()
    } else {
      setGuest(addLine(guestLines, bookId, quantity, stock)) // guest tự clamp theo tồn
    }
  }

  async function updateQty(bookId: number, quantity: number) {
    if (isLoggedIn) {
      await updateCartItemApi(bookId, quantity)
      invalidateCart()
    } else {
      setGuest(setLineQty(guestLines, bookId, quantity))
    }
  }

  async function removeItem(bookId: number) {
    if (isLoggedIn) {
      await removeCartItemApi(bookId)
      invalidateCart()
    } else {
      setGuest(removeLine(guestLines, bookId))
    }
  }

  // Cùng shape dòng giỏ tối giản cho cả 2 chế độ
  const items = isLoggedIn
    ? (serverCart?.items ?? []).map((item) => ({ book_id: item.book_id, quantity: item.quantity }))
    : guestLines

  return (
    <CartContext.Provider value={{ items, count: items.length, addItem, updateQty, removeItem }}>
      {children}
    </CartContext.Provider>
  )
}
