import { z } from 'zod'

// Guest cart trong localStorage — CHỈ lưu {book_id, quantity}, không lưu giá/tên sách.
// Lý do: giá có thể đổi trong lúc giỏ nằm chờ — trang giỏ luôn lấy thông tin HIỆN TẠI
// qua GET /api/books/batch (SNAPSHOT principle chỉ áp dụng cho Order, không cho cart).
const STORAGE_KEY = 'bookstore_guest_cart'

// Trần 99 cuốn/dòng — khớp schema backend
export const MAX_QTY_PER_LINE = 99

// localStorage là input KHÔNG TIN ĐƯỢC (user/extension sửa tùy ý) —
// validate bằng Zod như request body ở backend, hỏng thì dọn key (bài học review vòng 1)
const guestCartSchema = z.array(
  z.object({
    book_id: z.number().int().positive(),
    quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
  }),
)

export type GuestCartLine = z.infer<typeof guestCartSchema>[number]

// Gom các dòng TRÙNG book_id lấy max — localStorage bị sửa tay có thể chứa trùng,
// gây badge sai + duplicate React key ở trang giỏ. Chuẩn hóa ngay tại cửa đọc để
// mọi nơi dùng guest cart (badge, trang giỏ, payload merge) luôn nhận dữ liệu sạch.
function normalizeLines(lines: GuestCartLine[]): GuestCartLine[] {
  const map = new Map<number, number>()
  for (const line of lines) {
    map.set(line.book_id, Math.max(map.get(line.book_id) ?? 0, line.quantity))
  }
  return [...map].map(([book_id, quantity]) => ({ book_id, quantity }))
}

export function loadGuestCart(): GuestCartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const result = guestCartSchema.safeParse(JSON.parse(raw))
    if (!result.success) {
      localStorage.removeItem(STORAGE_KEY) // dữ liệu hỏng → dọn luôn
      return []
    }
    return normalizeLines(result.data)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

export function saveGuestCart(lines: GuestCartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
}

export function clearGuestCart() {
  localStorage.removeItem(STORAGE_KEY)
}

// ---------- Các hàm thuần thao tác trên mảng dòng giỏ ----------
// (logic soi gương service backend: add = cộng dồn, clamp theo tồn kho + trần 99)

export function addLine(lines: GuestCartLine[], bookId: number, qty: number, stock: number): GuestCartLine[] {
  const cap = Math.min(stock, MAX_QTY_PER_LINE)
  const existing = lines.find((line) => line.book_id === bookId)
  if (!existing) {
    return [...lines, { book_id: bookId, quantity: Math.min(qty, cap) }]
  }
  return lines.map((line) =>
    line.book_id === bookId ? { ...line, quantity: Math.min(line.quantity + qty, cap) } : line,
  )
}

export function setLineQty(lines: GuestCartLine[], bookId: number, qty: number): GuestCartLine[] {
  return lines.map((line) => (line.book_id === bookId ? { ...line, quantity: qty } : line))
}

export function removeLine(lines: GuestCartLine[], bookId: number): GuestCartLine[] {
  return lines.filter((line) => line.book_id !== bookId)
}
