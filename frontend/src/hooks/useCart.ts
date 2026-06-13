import { createContext, useContext } from 'react'

// Context + hook tách khỏi store/CartContext.tsx theo quy tắc Fast Refresh
// (file chứa component chỉ export component) — giống cặp useAuth/AuthContext.

// Dòng giỏ tối giản dùng chung cho cả 2 chế độ (guest + user):
// chỉ id + số lượng; thông tin sách (giá, tên, bìa) là việc của trang giỏ
export interface CartLine {
  book_id: number
  quantity: number
}

export interface CartContextValue {
  items: CartLine[]
  count: number // số DÒNG (số đầu sách khác nhau) — hiện trên badge Navbar
  // stock truyền vào để chế độ guest tự clamp (không có backend chặn hộ);
  // chế độ user thì backend validate, vượt tồn sẽ reject → caller hiện thông báo
  addItem: (bookId: number, quantity: number, stock: number) => Promise<void>
  updateQty: (bookId: number, quantity: number) => Promise<void>
  removeItem: (bookId: number) => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart phải được dùng bên trong <CartProvider>')
  return ctx
}
