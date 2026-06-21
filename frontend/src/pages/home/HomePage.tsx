import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CreditCard, Gift, RotateCcw, Search, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBestsellers, fetchBooks } from '../../api/books'
import { fetchCategories } from '../../api/categories'
import BookCard from '../../features/catalog/BookCard'
import BookCardSkeleton from '../../features/catalog/BookCardSkeleton'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

// Tiêu đề của một khối (mắt-trên nhỏ + tên + link "Xem tất cả")
function SectionHead({ eyebrow, title, to }: { eyebrow: string; title: string; to: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</div>
        <h2 className="font-serif text-3xl font-semibold text-base-content mt-1">{title}</h2>
      </div>
      <Link
        to={to}
        className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:gap-2 transition-all"
      >
        Xem tất cả <ArrowRight size={16} />
      </Link>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-3xl font-bold text-base-content leading-none">{value}</div>
      <div className="text-xs text-base-content/50 mt-1">{label}</div>
    </div>
  )
}

function ValueProp({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-11 h-11 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div>
        <div className="font-semibold text-sm text-base-content">{title}</div>
        <div className="text-xs text-base-content/55">{desc}</div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  useDocumentTitle() // trang chủ → tiêu đề thương hiệu mặc định

  // Sách mới: 10 cuốn mới nhất (sort mặc định = newest). total dùng cho số liệu hero.
  const { data: newBooks, isPending: newPending } = useQuery({
    queryKey: ['books', { limit: '10' }],
    queryFn: () => fetchBooks({ limit: '10' }),
  })
  // Bán chạy: top 5 theo lượng bán (đơn Delivered). Rỗng khi chưa có đơn giao → ẩn khối.
  const { data: bestsellers } = useQuery({
    queryKey: ['bestsellers', 5],
    queryFn: () => fetchBestsellers(5),
  })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  })
  // Chỉ hiện thể loại CÓ sách (book_count > 0) ở khu khám phá — tránh bấm vào ra trang rỗng
  const visibleCategories = (categories ?? []).filter((c) => (c.book_count ?? 0) > 0)

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q')?.toString().trim()
    navigate(q ? `/books?q=${encodeURIComponent(q)}` : '/books')
  }

  return (
    <div>
      {/* ===================== HERO ===================== */}
      <section className="bg-base-200 bg-[radial-gradient(circle_at_85%_15%,rgba(178,139,76,0.10),transparent_45%)]">
        <div className="max-w-6xl mx-auto px-4 py-14 md:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-accent border border-accent/30 bg-accent/10 rounded-full px-3 py-1">
              ★ Hàng nghìn đầu sách chọn lọc
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-base-content leading-tight mt-4">
              Tìm cuốn sách
              <br />
              dành cho riêng bạn
            </h1>
            <p className="text-base-content/70 mt-4 text-lg max-w-lg">
              Văn học, kinh tế, kỹ năng và thiếu nhi — giao nhanh, gói ghém như một món quà tri thức.
            </p>

            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-6 flex items-center gap-2 bg-base-100 border border-base-300 rounded-full p-1.5 pl-5 max-w-lg shadow-sm"
            >
              <Search size={18} className="text-base-content/50 shrink-0" />
              <input
                name="q"
                aria-label="Tìm sách"
                placeholder="Tên sách, tác giả…"
                className="bg-transparent outline-none w-full text-sm"
              />
              <button type="submit" className="btn btn-primary rounded-full">
                Tìm sách
              </button>
            </form>

            {visibleCategories.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap items-center">
                <span className="text-sm text-base-content/50">Phổ biến:</span>
                {visibleCategories.slice(0, 4).map((c) => (
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

            <div className="flex gap-8 mt-8 pt-6 border-t border-base-300">
              <Stat value={newBooks ? `${newBooks.total}` : '—'} label="Đầu sách" />
              <Stat value={categories ? `${categories.length}` : '—'} label="Thể loại" />
              <Stat value="24h" label="Giao nội thành" />
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CAM KẾT DỊCH VỤ ===================== */}
      <section className="bg-base-100 border-y border-base-300">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-5">
          <ValueProp icon={<Truck size={22} />} title="Giao 24h nội thành" desc="Toàn quốc 2–4 ngày" />
          <ValueProp icon={<RotateCcw size={22} />} title="Đổi trả 7 ngày" desc="Miễn phí, dễ dàng" />
          <ValueProp icon={<CreditCard size={22} />} title="COD & VNPay" desc="Thanh toán an toàn" />
          <ValueProp icon={<Gift size={22} />} title="Bọc sách miễn phí" desc="Quà tặng kèm tinh tế" />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-14 space-y-16">
        {/* ===================== BÁN CHẠY (ẩn khi chưa có đơn Delivered) ===================== */}
        {bestsellers && bestsellers.length > 0 && (
          <section>
            <SectionHead eyebrow="Độc giả yêu thích" title="Bán chạy nhất" to="/books" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {bestsellers.map((book, i) => (
                <div key={book.id} className="relative">
                  {/* Huy hiệu thứ hạng — chỉ là lớp trang trí phủ lên BookCard (giữ BookCard nguyên) */}
                  <span className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-secondary text-secondary-content font-serif font-bold text-lg flex items-center justify-center shadow-md">
                    {i + 1}
                  </span>
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===================== SÁCH MỚI ===================== */}
        <section>
          <SectionHead eyebrow="Vừa lên kệ" title="Sách mới" to="/books" />
          {newPending ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <BookCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {newBooks?.items.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </section>

        {/* ===================== KHÁM PHÁ THEO THỂ LOẠI ===================== */}
        {visibleCategories.length > 0 && (
          <section>
            <h2 className="font-serif text-3xl font-semibold text-base-content mb-6">
              Khám phá theo thể loại
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {visibleCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/books?category=${c.slug}`}
                  className="flex flex-col items-center text-center gap-2 bg-base-100 border border-base-300 rounded-box p-5 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 transition-all"
                >
                  <BookOpen size={26} className="text-accent" />
                  <div className="font-serif font-semibold text-base-content leading-tight">
                    {c.name}
                  </div>
                  <div className="text-xs text-base-content/50">{c.book_count ?? 0} cuốn</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
