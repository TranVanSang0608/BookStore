import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBooksByIds, type BookCardData } from '../../api/books'
import { fetchCart } from '../../api/cart'
import { getApiErrorMessage } from '../../api/client'
import CoverImage from '../../features/catalog/CoverImage'
import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import { formatPrice } from '../../lib/format'

// Một dòng hiển thị trên trang giỏ, đã quy về cùng shape cho cả 2 chế độ.
// dead = sách không còn bán (bị ẩn/xóa): user thấy dòng inactive từ server,
// guest thấy id vắng mặt trong kết quả /books/batch
interface DisplayLine {
  book_id: number
  quantity: number
  book: BookCardData | null
  dead: boolean
}

export default function CartPage() {
  const { isLoggedIn } = useAuth()
  const { items, updateQty, removeItem } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  // Chế độ user: giỏ enrich sẵn từ server (kèm is_active + subtotal do BE tính)
  const { data: serverCart, isPending: serverPending } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    enabled: isLoggedIn,
  })

  // Chế độ guest: localStorage chỉ có book_id + qty → enrich qua /books/batch
  const ids = items.map((item) => item.book_id)
  const { data: guestBooks, isPending: guestPending } = useQuery({
    queryKey: ['books', 'batch', ids],
    queryFn: () => fetchBooksByIds(ids),
    enabled: !isLoggedIn && ids.length > 0,
  })

  const lines: DisplayLine[] = isLoggedIn
    ? (serverCart?.items ?? []).map((item) => ({
        book_id: item.book_id,
        quantity: item.quantity,
        book: item.book,
        dead: !item.book.is_active,
      }))
    : items.map((item) => {
        const book = guestBooks?.find((b) => b.id === item.book_id) ?? null
        return { book_id: item.book_id, quantity: item.quantity, book, dead: book === null }
      })

  // Subtotal: user lấy số BE đã tính; guest tự cộng từ giá hiện tại (chỉ dòng sống)
  const subtotal = isLoggedIn
    ? (serverCart?.subtotal ?? 0)
    : lines.reduce((sum, line) => (line.dead || !line.book ? sum : sum + line.book.price * line.quantity), 0)

  // Dòng có vấn đề (hết bán / vượt tồn) → chặn nút đặt hàng; backend Phase 4 sẽ
  // re-validate lại toàn bộ khi tạo đơn — UI chỉ phản ánh, không phải lớp bảo vệ
  const hasProblem = lines.some(
    (line) => line.dead || (line.book !== null && line.quantity > line.book.stock_quantity),
  )

  const isPending = isLoggedIn ? serverPending : ids.length > 0 && guestPending

  async function handleQty(bookId: number, qty: number) {
    setError('')
    try {
      await updateQty(bookId, qty)
    } catch (err) {
      setError(getApiErrorMessage(err)) // vd 400 "Chỉ còn X cuốn trong kho"
    }
  }

  async function handleRemove(bookId: number) {
    setError('')
    try {
      await removeItem(bookId)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  function handleCheckout() {
    // Checkout bắt buộc đăng nhập (D2). Guest → trang login kèm state.from:
    // login xong merge giỏ chạy ngầm rồi quay lại đúng /checkout — giỏ không mất
    if (isLoggedIn) navigate('/checkout')
    else navigate('/login', { state: { from: '/checkout' } })
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Giỏ hàng</h1>

      {error && <div className="alert alert-error text-sm">{error}</div>}

      {isPending && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {!isPending && lines.length === 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-16 space-y-2">
            <p className="text-base-content/60">Giỏ hàng của bạn đang trống</p>
            <Link to="/books" className="btn btn-primary">
              Khám phá sách ngay
            </Link>
          </div>
        </div>
      )}

      {!isPending && lines.length > 0 && (
        <>
          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th colSpan={2}>Sách</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <CartRow
                      key={line.book_id}
                      line={line}
                      onQty={handleQty}
                      onRemove={handleRemove}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card bg-base-100 shadow">
            <div className="card-body p-4 flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg">
                  Tạm tính: <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
                </p>
                <p className="text-sm text-base-content/60">
                  Phí vận chuyển sẽ được tính ở bước đặt hàng
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleCheckout}
                disabled={hasProblem || subtotal === 0}
              >
                Tiến hành đặt hàng
              </button>
            </div>
          </div>

          {hasProblem && (
            <div className="alert alert-warning text-sm">
              Giỏ có sách không còn bán hoặc vượt tồn kho — hãy chỉnh lại trước khi đặt hàng
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CartRow({
  line,
  onQty,
  onRemove,
}: {
  line: DisplayLine
  onQty: (bookId: number, qty: number) => Promise<void>
  onRemove: (bookId: number) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  // Sách không còn bán: hiện cảnh báo + chỉ cho xóa (không stepper, không tính tiền)
  if (line.dead || !line.book) {
    return (
      <tr className="opacity-60">
        <td colSpan={4}>
          <span className="badge badge-warning badge-sm mr-2">Không còn bán</span>
          {line.book ? line.book.title : `Sách này không còn bán`}
        </td>
        <td>—</td>
        <td>
          <button className="link link-error" onClick={() => onRemove(line.book_id)}>
            Xóa
          </button>
        </td>
      </tr>
    )
  }

  const book = line.book
  const maxQty = Math.min(book.stock_quantity, 99)
  const overStock = line.quantity > book.stock_quantity

  // Mọi thay đổi số lượng đi qua đây: clamp 1..maxQty rồi gọi lên context
  async function changeQty(next: number) {
    const clamped = Math.min(Math.max(next, 1), maxQty)
    if (clamped === line.quantity) return
    setBusy(true)
    await onQty(line.book_id, clamped)
    setBusy(false)
  }

  return (
    <tr>
      <td className="w-14">
        <CoverImage url={book.cover_image_url} title={book.title} className="w-10 h-14 rounded" />
      </td>
      <td>
        <Link to={`/books/${book.slug}`} className="font-medium link-hover">
          {book.title}
        </Link>
        <p className="text-sm text-base-content/60">{book.author.name}</p>
        {overStock && (
          <p className="text-warning text-sm">Chỉ còn {book.stock_quantity} cuốn — hãy giảm số lượng</p>
        )}
      </td>
      <td className="whitespace-nowrap">{formatPrice(book.price)}</td>
      <td>
        <div className="join">
          <button
            className="join-item btn btn-sm"
            disabled={busy || line.quantity <= 1}
            onClick={() => changeQty(line.quantity - 1)}
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxQty}
            className="join-item input input-bordered input-sm w-14 text-center"
            value={line.quantity}
            disabled={busy}
            onChange={(e) => {
              const value = Number(e.target.value)
              if (Number.isInteger(value) && value >= 1) void changeQty(value)
            }}
          />
          <button
            className="join-item btn btn-sm"
            disabled={busy || line.quantity >= maxQty}
            onClick={() => changeQty(line.quantity + 1)}
          >
            +
          </button>
        </div>
      </td>
      <td className="whitespace-nowrap font-medium">{formatPrice(book.price * line.quantity)}</td>
      <td>
        <button className="link link-error" disabled={busy} onClick={() => onRemove(line.book_id)}>
          Xóa
        </button>
      </td>
    </tr>
  )
}
