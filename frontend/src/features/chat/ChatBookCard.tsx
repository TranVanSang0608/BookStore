import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/format'
import CoverImage from '../catalog/CoverImage'
import type { ChatBook } from '../../api/chat'

// Thẻ sách mini trong khung chat — bấm vào mở trang chi tiết /books/:slug.
// Tái dùng CoverImage + formatPrice để đồng bộ với thẻ sách ở trang /books.
export default function ChatBookCard({ book }: { book: ChatBook }) {
  const soldOut = book.stock === 0
  return (
    <Link
      to={`/books/${book.slug}`}
      className="flex gap-2.5 p-2 rounded-lg border border-base-300 bg-base-100 hover:border-primary hover:shadow-sm transition-colors"
    >
      <figure className="relative w-12 shrink-0 aspect-[2/3] rounded overflow-hidden ring-1 ring-black/5">
        <CoverImage url={book.coverUrl} title={book.title} className="w-full h-full" />
        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-error/80 text-error-content text-[10px] text-center leading-tight py-0.5">
            Hết hàng
          </span>
        )}
      </figure>
      <div className="min-w-0 flex-1">
        <h4 className="font-serif font-semibold text-sm leading-tight line-clamp-2">{book.title}</h4>
        <p className="text-xs text-base-content/70 mt-0.5 line-clamp-1">{book.author}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-primary text-sm">{formatPrice(book.price)}</span>
          {book.rating > 0 && (
            <span className="text-xs text-warning">★ {book.rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
