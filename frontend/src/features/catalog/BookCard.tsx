import { Link } from 'react-router-dom'
import type { BookCardData } from '../../api/books'
import { formatPrice } from '../../lib/format'
import CoverImage from './CoverImage'

// Card sách dùng chung cho trang list, trang chủ và trang tác giả
export default function BookCard({ book }: { book: BookCardData }) {
  return (
    <Link
      to={`/books/${book.slug}`}
      className="card bg-base-100 shadow hover:shadow-lg transition-shadow"
    >
      {/* aspect-[2/3]: giữ đúng tỷ lệ bìa sách dù ảnh gốc méo hay thiếu */}
      <figure className="aspect-[2/3] w-full">
        <CoverImage url={book.cover_image_url} title={book.title} className="w-full h-full" />
      </figure>
      <div className="card-body p-4 gap-1">
        <h3 className="font-semibold leading-snug line-clamp-2">{book.title}</h3>
        <p className="text-sm text-base-content/60">{book.author.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-primary font-bold">{formatPrice(book.price)}</span>
          {book.stock_quantity === 0 && <span className="badge badge-error badge-sm">Hết hàng</span>}
        </div>
      </div>
    </Link>
  )
}
