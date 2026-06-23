import { Check, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { BookCardData } from '../../api/books'
import { useCart } from '../../hooks/useCart'
import { formatPrice } from '../../lib/format'
import CoverImage from './CoverImage'
import Stars from './Stars'
import WishlistButton from './WishlistButton'

// Nút thêm nhanh vào giỏ ngay trên thẻ sách. Tách riêng để state (đang thêm / đã thêm)
// không làm re-render cả lưới sách. Dùng lại addItem của CartContext → giữ nguyên logic giỏ.
function QuickAdd({ book }: { book: BookCardData }) {
  const { addItem } = useCart()
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<'idle' | 'added' | 'error'>('idle')

  async function handleAdd() {
    setBusy(true)
    try {
      await addItem(book.id, 1, book.stock_quantity)
      setState('added')
      setTimeout(() => setState('idle'), 1500)
    } catch {
      // Chế độ user: backend có thể từ chối nếu vượt tồn → báo nhẹ rồi tự ẩn
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={busy}
      aria-label={`Thêm ${book.title} vào giỏ`}
      className="btn btn-sm btn-outline btn-primary gap-1"
    >
      {state === 'added' ? <Check size={15} /> : <ShoppingCart size={15} />}
      {state === 'added' ? 'Đã thêm' : state === 'error' ? 'Lỗi' : 'Giỏ'}
    </button>
  )
}

// Thẻ sách dùng chung cho trang chủ, danh sách, tác giả, sách liên quan.
// Khung là <div>; nút tim + nút "Giỏ" là ANH EM với các <Link> (không lồng button trong <a>).
export default function BookCard({ book }: { book: BookCardData }) {
  const soldOut = book.stock_quantity === 0
  return (
    <div className="group bg-base-100 border border-base-300 rounded-box overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <div className="p-3 pb-0">
        {/* aspect-[2/3]: giữ đúng tỷ lệ bìa sách dù ảnh gốc méo hay thiếu */}
        <figure className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm ring-1 ring-black/5">
          {/* Link ảnh: ẩn với trình đọc màn hình + bỏ khỏi tab để KHÔNG trùng đích
              với link tiêu đề bên dưới (tiêu đề mới là link "chính" được đọc) */}
          <Link
            to={`/books/${book.slug}`}
            tabIndex={-1}
            aria-hidden="true"
            className="block w-full h-full"
          >
            <CoverImage url={book.cover_image_url} title={book.title} className="w-full h-full" />
          </Link>
          {soldOut && (
            <span className="absolute top-2 left-2 badge badge-error badge-sm">Hết hàng</span>
          )}
          {/* Nút tim đứng RIÊNG, không nằm trong <Link> → HTML hợp lệ */}
          <WishlistButton bookId={book.id} className="absolute top-2 right-2" />
        </figure>
      </div>

      <div className="px-3 pb-3 pt-2.5">
        <Link to={`/books/${book.slug}`} className="block">
          <h3 className="font-serif font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary">
            {book.title}
          </h3>
        </Link>
        <p className="text-sm text-base-content/70 mt-0.5">{book.author.name}</p>
        {book.review_count > 0 && (
          <div className="mt-1">
            <Stars value={book.avg_rating} count={book.review_count} />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="font-serif font-bold text-xl text-primary">{formatPrice(book.price)}</span>
          {!soldOut && <QuickAdd book={book} />}
        </div>
      </div>
    </div>
  )
}
