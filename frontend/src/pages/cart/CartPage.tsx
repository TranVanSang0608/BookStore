import { useQuery } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBooksByIds, type BookCardData } from '../../api/books'
import { fetchCart } from '../../api/cart'
import { getApiErrorMessage } from '../../api/client'
import EmptyState from '../../components/EmptyState'
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
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-serif text-3xl font-semibold text-base-content mb-5">Giỏ hàng</h1>

      {error && <div className="alert alert-error text-sm mb-4">{error}</div>}

      {isPending && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {!isPending && lines.length === 0 && (
        <EmptyState
          icon={<ShoppingCart size={44} />}
          title="Giỏ hàng của bạn đang trống"
          description="Khám phá hàng nghìn đầu sách và thêm vào giỏ nhé."
          action={
            <Link to="/books" className="btn btn-primary">
              Khám phá sách ngay
            </Link>
          }
        />
      )}

      {!isPending && lines.length > 0 && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* Cột trái: danh sách dòng giỏ */}
          <div className="space-y-3">
            {lines.map((line) => (
              <CartRow key={line.book_id} line={line} onQty={handleQty} onRemove={handleRemove} />
            ))}
          </div>

          {/* Cột phải: tóm tắt */}
          <div className="bg-base-100 border border-base-300 rounded-box p-5 lg:sticky lg:top-4">
            <h2 className="font-serif text-xl font-semibold text-base-content mb-3">Tóm tắt</h2>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-base-content/70">Tạm tính</span>
              <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-base-content/55 mb-4">
              Phí vận chuyển sẽ được tính ở bước đặt hàng.
            </p>
            <button
              className="btn btn-primary w-full"
              onClick={handleCheckout}
              disabled={hasProblem || subtotal === 0}
            >
              Tiến hành đặt hàng
            </button>
            {hasProblem && (
              <div className="alert alert-warning text-xs mt-3">
                Giỏ có sách không còn bán hoặc vượt tồn kho — hãy chỉnh lại trước khi đặt hàng.
              </div>
            )}
          </div>
        </div>
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
      <div className="flex items-center gap-3 bg-base-100 border border-base-300 rounded-box p-3 opacity-70">
        <span className="badge badge-warning badge-sm">Không còn bán</span>
        <span className="flex-1 text-sm">
          {line.book ? line.book.title : 'Sách này không còn bán'}
        </span>
        <button
          className="btn btn-ghost btn-sm text-error"
          onClick={() => onRemove(line.book_id)}
        >
          Xóa
        </button>
      </div>
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
    <div className="flex gap-3 bg-base-100 border border-base-300 rounded-box p-3">
      <Link to={`/books/${book.slug}`} className="shrink-0">
        <CoverImage url={book.cover_image_url} title={book.title} className="w-14 h-20 rounded" />
      </Link>

      <div className="flex-1 min-w-0">
        <Link to={`/books/${book.slug}`} className="font-medium hover:text-primary line-clamp-2">
          {book.title}
        </Link>
        <p className="text-sm text-base-content/60">{book.author.name}</p>
        <p className="text-sm text-primary font-semibold mt-0.5">{formatPrice(book.price)}</p>
        {overStock && (
          <p className="text-warning text-xs mt-1">
            Chỉ còn {book.stock_quantity} cuốn — hãy giảm số lượng
          </p>
        )}
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <div className="join">
          <button
            className="join-item btn btn-xs"
            disabled={busy || line.quantity <= 1}
            onClick={() => changeQty(line.quantity - 1)}
            aria-label="Giảm số lượng"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxQty}
            className="join-item input input-bordered input-xs w-12 text-center"
            value={line.quantity}
            disabled={busy}
            onChange={(e) => {
              const value = Number(e.target.value)
              if (Number.isInteger(value) && value >= 1) void changeQty(value)
            }}
          />
          <button
            className="join-item btn btn-xs"
            disabled={busy || line.quantity >= maxQty}
            onClick={() => changeQty(line.quantity + 1)}
            aria-label="Tăng số lượng"
          >
            +
          </button>
        </div>
        <div className="font-semibold whitespace-nowrap">
          {formatPrice(book.price * line.quantity)}
        </div>
        <button
          className="text-error text-sm hover:underline"
          disabled={busy}
          onClick={() => onRemove(line.book_id)}
        >
          Xóa
        </button>
      </div>
    </div>
  )
}
