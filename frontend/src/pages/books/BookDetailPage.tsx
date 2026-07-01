import { useQuery } from '@tanstack/react-query'
import { Check, Minus, Plus, ShoppingCart, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchBookBySlug, type BookDetail } from '../../api/books'
import { getApiErrorMessage } from '../../api/client'
import CoverImage from '../../features/catalog/CoverImage'
import RelatedBooks from '../../features/catalog/RelatedBooks'
import ReviewsSection from '../../features/catalog/ReviewsSection'
import Stars from '../../features/catalog/Stars'
import WishlistButton from '../../features/catalog/WishlistButton'
import { useCart } from '../../hooks/useCart'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatPrice } from '../../lib/format'

// Khối chọn số lượng + nút thêm giỏ — tách component để state (qty, thông báo)
// không làm re-render cả trang chi tiết
function AddToCart({ bookId, stock }: { bookId: number; stock: number }) {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [buying, setBuying] = useState(false)

  const maxQty = Math.min(stock, 99)
  const busy = adding || buying

  // Clamp số lượng 1..maxQty (dùng cho cả nút −/+ lẫn gõ tay)
  function clampQty(v: number) {
    setQty(Number.isInteger(v) ? Math.min(Math.max(v, 1), maxQty) : 1)
  }

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

  // Mua ngay = thêm sách vào giỏ rồi sang thẳng checkout. Khách chưa đăng nhập sẽ bị
  // RequireAuth đưa qua /login rồi quay lại /checkout (giỏ guest merge vào — như luồng sẵn có).
  async function handleBuyNow() {
    setMessage('')
    setError('')
    setBuying(true)
    try {
      await addItem(bookId, qty, stock)
      navigate('/checkout')
    } catch (err) {
      setError(getApiErrorMessage(err))
      setBuying(false) // lỗi thì ở lại trang; thành công thì đã điều hướng đi
    }
  }

  if (stock === 0) {
    return (
      <button className="btn btn-primary w-fit" disabled>
        Hết hàng
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Stepper số lượng: nút − [ô số] + */}
        <div className="join border border-base-300 rounded-lg">
          <button
            type="button"
            className="join-item btn btn-sm btn-ghost"
            onClick={() => clampQty(qty - 1)}
            disabled={qty <= 1}
            aria-label="Giảm số lượng"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            min={1}
            max={maxQty}
            className="join-item input input-sm w-14 text-center"
            value={qty}
            onChange={(e) => clampQty(Number(e.target.value))}
            aria-label="Số lượng"
          />
          <button
            type="button"
            className="join-item btn btn-sm btn-ghost"
            onClick={() => clampQty(qty + 1)}
            disabled={qty >= maxQty}
            aria-label="Tăng số lượng"
          >
            <Plus size={16} />
          </button>
        </div>
        <button className="btn btn-primary gap-2" onClick={handleAdd} disabled={busy}>
          {adding ? <span className="loading loading-spinner loading-sm" /> : <ShoppingCart size={18} />}
          Thêm vào giỏ
        </button>
        <button className="btn btn-outline btn-primary gap-2" onClick={handleBuyNow} disabled={busy}>
          {buying ? <span className="loading loading-spinner loading-sm" /> : <Zap size={18} />}
          Mua ngay
        </button>
      </div>
      {message && <p className="text-success text-sm">{message}</p>}
      {error && <p className="text-error text-sm">{error}</p>}
    </div>
  )
}

// Thanh CTA cố định đáy màn hình — chỉ mobile (lg:hidden). Không dùng chung state với AddToCart
// (qty luôn = 1 cho nhanh, giống QuickAdd của BookCard) — người cần đổi số lượng vẫn cuộn lên
// dùng khối AddToCart gốc phía trên như cũ.
function StickyAddToCart({ book }: { book: BookDetail }) {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState(false)

  async function handleAdd() {
    setBusy('add')
    setError(false)
    try {
      await addItem(book.id, 1, book.stock_quantity)
      setAdded(true)
      setTimeout(() => setAdded(false), 1500)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2000)
    } finally {
      setBusy(null)
    }
  }

  async function handleBuyNow() {
    setBusy('buy')
    setError(false)
    try {
      await addItem(book.id, 1, book.stock_quantity)
      navigate('/checkout')
    } catch {
      setError(true)
      setTimeout(() => setError(false), 2000)
      setBusy(null)
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-base-100 border-t border-base-300 p-3 flex items-center gap-3">
      <div className="min-w-0">
        <p className="font-serif text-lg font-bold text-primary whitespace-nowrap">
          {formatPrice(book.price)}
        </p>
        {error && <p className="text-error text-xs">Chưa thêm được, thử lại</p>}
      </div>
      <div className="flex-1 flex items-center gap-2 justify-end">
        {book.stock_quantity === 0 ? (
          <button className="btn btn-primary btn-sm" disabled>
            Hết hàng
          </button>
        ) : (
          <>
            <button
              className="btn btn-outline btn-primary btn-sm gap-1"
              onClick={handleAdd}
              disabled={busy !== null}
              aria-label="Thêm vào giỏ"
            >
              {busy === 'add' ? (
                <span className="loading loading-spinner loading-xs" />
              ) : added ? (
                <Check size={16} />
              ) : (
                <ShoppingCart size={16} />
              )}
              Thêm giỏ
            </button>
            <button
              className="btn btn-primary btn-sm gap-1"
              onClick={handleBuyNow}
              disabled={busy !== null}
            >
              {busy === 'buy' ? <span className="loading loading-spinner loading-xs" /> : <Zap size={16} />}
              Mua ngay
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function BookDetailPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  // Mở từ link "Đánh giá" (đơn đã giao) có ?tab=reviews → mở sẵn tab Đánh giá
  const wantsReview = searchParams.get('tab') === 'reviews'
  const [tab, setTab] = useState<'desc' | 'info' | 'reviews'>(wantsReview ? 'reviews' : 'desc')
  const tabsRef = useRef<HTMLDivElement>(null)

  const { data: book, isPending, isError } = useQuery({
    queryKey: ['book', slug],
    queryFn: () => fetchBookBySlug(slug!),
  })
  useDocumentTitle(book?.title) // load xong → tab hiện tên sách

  // ?tab=reviews: khi sách tải xong thì cuộn tới khu tab (để thấy ngay ô viết đánh giá)
  useEffect(() => {
    if (book && wantsReview) tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [book, wantsReview])

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

  const tabs = [
    { key: 'desc', label: 'Mô tả' },
    { key: 'info', label: 'Thông tin' },
    { key: 'reviews', label: `Đánh giá (${book.review_count})` },
  ] as const

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-base-content/70 mb-4 flex gap-2 items-center flex-wrap">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>›</span>
        <Link to="/books" className="hover:text-primary">
          Tất cả sách
        </Link>
        <span>›</span>
        <span className="text-base-content/70 line-clamp-1">{book.title}</span>
      </nav>

      {/* ===== HERO ===== */}
      <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start bg-base-100 border border-base-300 rounded-box p-6">
        <figure className="relative">
          <CoverImage
            url={book.cover_image_url}
            title={book.title}
            className="w-full aspect-[2/3] rounded-lg shadow-sm ring-1 ring-black/5"
          />
          <WishlistButton bookId={book.id} className="absolute top-3 right-3" />
        </figure>

        <div className="space-y-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-base-content leading-tight">
              {book.title}
            </h1>
            <p className="text-base-content/70 mt-1">
              Tác giả:{' '}
              <Link to={`/author/${book.author.id}`} className="text-primary hover:underline">
                {book.author.name}
              </Link>
            </p>
          </div>

          {book.review_count > 0 && <Stars value={book.avg_rating} count={book.review_count} />}

          {book.categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {book.categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/books?category=${c.slug}`}
                  className="badge badge-outline border-base-300 hover:border-primary hover:text-primary"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          <p className="font-serif text-4xl font-bold text-primary">{formatPrice(book.price)}</p>

          {book.stock_quantity > 0 ? (
            <span className="badge badge-success badge-outline">
              Còn hàng ({book.stock_quantity})
            </span>
          ) : (
            <span className="badge badge-error badge-outline">Hết hàng</span>
          )}

          <AddToCart bookId={book.id} stock={book.stock_quantity} />
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div ref={tabsRef} className="mt-8 bg-base-100 border border-base-300 rounded-box p-6 scroll-mt-4">
        <div role="tablist" className="flex gap-1 border-b border-base-300">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/70 hover:text-base-content'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pt-6">
          {tab === 'desc' &&
            (book.description ? (
              // whitespace-pre-line: giữ các đoạn xuống dòng trong mô tả
              <p className="text-base-content/80 whitespace-pre-line leading-relaxed">
                {book.description}
              </p>
            ) : (
              <p className="text-base-content/70">Chưa có mô tả cho sách này.</p>
            ))}

          {tab === 'info' &&
            (thongTinXuatBan.length > 0 ? (
              <table className="table table-sm max-w-md">
                <tbody>
                  {thongTinXuatBan.map((row) => (
                    <tr key={row.label}>
                      <td className="text-base-content/70 w-40">{row.label}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-base-content/70">Chưa cập nhật thông tin xuất bản.</p>
            ))}

          {tab === 'reviews' && <ReviewsSection bookId={book.id} />}
        </div>
      </div>

      <RelatedBooks slug={book.slug} />

      <StickyAddToCart book={book} />
    </div>
  )
}
