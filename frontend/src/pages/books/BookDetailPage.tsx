import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchBookBySlug } from '../../api/books'
import { getApiErrorMessage } from '../../api/client'
import CoverImage from '../../features/catalog/CoverImage'
import RelatedBooks from '../../features/catalog/RelatedBooks'
import ReviewsSection from '../../features/catalog/ReviewsSection'
import Stars from '../../features/catalog/Stars'
import WishlistButton from '../../features/catalog/WishlistButton'
import { useCart } from '../../hooks/useCart'
import { formatPrice } from '../../lib/format'

// Khối chọn số lượng + nút thêm giỏ — tách component để state (qty, thông báo)
// không làm re-render cả trang chi tiết
function AddToCart({ bookId, stock }: { bookId: number; stock: number }) {
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  const maxQty = Math.min(stock, 99)

  async function handleAdd() {
    setMessage('')
    setError('')
    setAdding(true)
    try {
      await addItem(bookId, qty, stock)
      setMessage('✓ Đã thêm vào giỏ')
    } catch (err) {
      // Chế độ user: backend có thể trả 400 "Chỉ còn X cuốn" khi giỏ đã có sẵn sách này
      setError(getApiErrorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  if (stock === 0) {
    return (
      <button className="btn btn-primary w-fit" disabled>
        Thêm vào giỏ
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={maxQty}
          className="input input-bordered w-20"
          value={qty}
          onChange={(e) => {
            // Clamp ngay khi nhập: 1 ≤ qty ≤ min(tồn kho, 99)
            const value = Number(e.target.value)
            setQty(Number.isInteger(value) ? Math.min(Math.max(value, 1), maxQty) : 1)
          }}
        />
        <button className="btn btn-primary" onClick={handleAdd} disabled={adding}>
          {adding && <span className="loading loading-spinner loading-sm" />}
          🛒 Thêm vào giỏ
        </button>
      </div>
      {message && <p className="text-success text-sm">{message}</p>}
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  )
}

export default function BookDetailPage() {
  const { slug } = useParams()

  const { data: book, isPending, isError } = useQuery({
    queryKey: ['book', slug],
    queryFn: () => fetchBookBySlug(slug!),
  })

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  // Slug sai hoặc sách đã bị ẩn — backend trả 404
  if (isError || !book) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="alert alert-error">Không tìm thấy sách</div>
        <Link to="/books" className="link link-primary mt-4 inline-block">
          ← Quay lại danh sách sách
        </Link>
      </div>
    )
  }

  // Chỉ hiện các dòng thông tin xuất bản có dữ liệu (field nào cũng có thể null)
  const thongTinXuatBan = [
    { label: 'Nhà xuất bản', value: book.publisher },
    { label: 'Năm xuất bản', value: book.published_year },
    { label: 'Ngôn ngữ', value: book.language },
    { label: 'Số trang', value: book.pages },
    { label: 'ISBN', value: book.isbn },
  ].filter((row) => row.value != null)

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="card lg:card-side bg-base-100 shadow">
        <figure className="lg:w-80 shrink-0 p-6 relative">
          <CoverImage
            url={book.cover_image_url}
            title={book.title}
            className="w-full aspect-[2/3] rounded-box"
          />
          <WishlistButton bookId={book.id} className="absolute top-8 right-8" />
        </figure>

        <div className="card-body space-y-2">
          <h1 className="card-title text-2xl">{book.title}</h1>

          <Stars value={book.avg_rating} count={book.review_count} />

          <p>
            Tác giả:{' '}
            <Link to={`/author/${book.author.id}`} className="link link-primary">
              {book.author.name}
            </Link>
          </p>

          <div className="flex gap-2 flex-wrap">
            {book.categories.map((c) => (
              <Link key={c.id} to={`/books?category=${c.slug}`} className="badge badge-outline">
                {c.name}
              </Link>
            ))}
          </div>

          <p className="text-3xl font-bold text-primary">{formatPrice(book.price)}</p>

          {book.stock_quantity > 0 ? (
            <span className="badge badge-success">Còn hàng ({book.stock_quantity})</span>
          ) : (
            <span className="badge badge-error">Hết hàng</span>
          )}

          <AddToCart bookId={book.id} stock={book.stock_quantity} />

          {book.description && (
            <div>
              <h2 className="font-semibold mt-2">Mô tả</h2>
              {/* whitespace-pre-line: giữ các đoạn xuống dòng trong mô tả */}
              <p className="text-base-content/80 whitespace-pre-line">{book.description}</p>
            </div>
          )}

          {thongTinXuatBan.length > 0 && (
            <div>
              <h2 className="font-semibold mt-2">Thông tin xuất bản</h2>
              <table className="table table-sm max-w-md">
                <tbody>
                  {thongTinXuatBan.map((row) => (
                    <tr key={row.label}>
                      <td className="text-base-content/60">{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ReviewsSection bookId={book.id} />
      <RelatedBooks slug={book.slug} />
    </div>
  )
}
