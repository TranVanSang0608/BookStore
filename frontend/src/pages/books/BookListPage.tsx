import { useQuery } from '@tanstack/react-query'
import { SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchBooks } from '../../api/books'
import { fetchCategories } from '../../api/categories'
import EmptyState from '../../components/EmptyState'
import BookCard from '../../features/catalog/BookCard'
import BookCardSkeleton from '../../features/catalog/BookCardSkeleton'
import BookFilters from '../../features/catalog/BookFilters'
import Pagination from '../../features/catalog/Pagination'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatPrice } from '../../lib/format'

// Chip lọc đang áp dụng — bấm × để gỡ
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/20 rounded-full pl-3 pr-2 py-1 hover:bg-primary/15"
    >
      {label}
      <X size={13} />
    </button>
  )
}

export default function BookListPage() {
  // Toàn bộ trạng thái lọc nằm TRÊN URL (?q=...&category=...&page=...):
  // copy link gửi người khác ra đúng kết quả, nút Back của trình duyệt hoạt động đúng
  const [searchParams, setSearchParams] = useSearchParams()
  const params = Object.fromEntries(searchParams.entries())
  useDocumentTitle('Kho sách')

  // Drawer bộ lọc trên mobile (ẩn sidebar mặc định, mở bằng nút "Bộ lọc" — xem BookFilters bên dưới)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileFiltersOpen])

  // queryKey chứa params → đổi filter là key đổi → React Query tự fetch lại
  const { data, isPending, isError, isFetching } = useQuery({
    queryKey: ['books', params],
    queryFn: () => fetchBooks(params),
  })

  // Danh sách thể loại gần như không đổi trong 1 phiên → staleTime Infinity khỏi fetch lại
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  })

  // Kết quả lọc/tìm còn quá ít (1-2 cuốn) → lưới bị trống nhiều, gợi ý thêm sách cho đỡ lạc lõng.
  // Có category đang lọc thì gợi ý cùng thể loại; chỉ có từ khoá (q) thì lấy sách mới nhất chung.
  // Chỉ áp dụng khi đang có filter (q/category) — mặc định 100 sách trong kho không rơi vào TH này.
  const showSuggestions =
    !!data && data.items.length > 0 && data.items.length <= 2 && !!(params.q || params.category)
  const { data: suggestions } = useQuery({
    queryKey: ['books', 'suggestions', params.category ?? ''],
    queryFn: () => fetchBooks(params.category ? { category: params.category, limit: '8' } : { limit: '8' }),
    enabled: showSuggestions,
  })
  const suggestionItems = (suggestions?.items ?? []).filter(
    (book) => !data?.items.some((item) => item.id === book.id),
  )

  // Cập nhật 1 phần query trên URL; giá trị rỗng thì xóa khỏi URL cho gọn
  function patchParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    // Đổi điều kiện lọc → luôn quay về trang 1 (trang 5 của kết quả cũ không còn ý nghĩa)
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next)
  }

  const activeCategory = categories?.find((c) => c.slug === params.category)?.name
  const hasPrice = !!(params.price_min || params.price_max)
  const priceLabel = `${params.price_min ? formatPrice(Number(params.price_min)) : '0đ'} – ${
    params.price_max ? formatPrice(Number(params.price_max)) : 'không giới hạn'
  }`
  const activeFilterCount = [params.q, activeCategory, hasPrice ? '1' : ''].filter(Boolean).length

  // Dùng chung cho cả bản sidebar (desktop) lẫn bản trong drawer (mobile): URL đổi từ bên ngoài
  // (Back/Forward, link share, chip ở trang chi tiết) → key đổi → cả 2 bản tự remount đọc value mới
  const filtersKey = `${params.q ?? ''}|${params.price_min ?? ''}|${params.price_max ?? ''}`
  const filtersProps = {
    categories: categories ?? [],
    value: {
      q: params.q ?? '',
      category: params.category ?? '',
      price_min: params.price_min ?? '',
      price_max: params.price_max ?? '',
      sort: params.sort ?? '',
    },
    onChange: patchParams,
  }

  return (
    <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 py-6">
      <nav aria-label="Breadcrumb" className="text-sm text-base-content/70 mb-2 flex gap-2 items-center">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>›</span>
        <span className="text-base-content/70">Tất cả sách</span>
      </nav>
      <h1 className="font-serif text-3xl font-semibold text-base-content">Kho sách</h1>
      <p className="text-base-content/70 mt-1 mb-6">Lọc nhanh theo thể loại và mức giá.</p>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Sidebar bộ lọc — chỉ hiện từ lg trở lên. Trên mobile bộ lọc chuyển vào drawer bên dưới
            để không đẩy lưới sách xuống sâu (bộ lọc rất dài: tìm kiếm + toàn bộ thể loại + giá). */}
        <div className="hidden lg:block">
          <BookFilters key={filtersKey} {...filtersProps} />
        </div>

        <div>
          {/* Thanh công cụ: nút bộ lọc (mobile) + số kết quả + sắp xếp */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="btn btn-sm btn-outline gap-1.5 lg:hidden"
              >
                <SlidersHorizontal size={15} />
                Bộ lọc
                {activeFilterCount > 0 && (
                  <span className="badge badge-primary badge-xs">{activeFilterCount}</span>
                )}
              </button>
              <div className="text-sm text-base-content/70">
                {data && (
                  <>
                    Hiển thị <strong className="text-base-content">{data.total}</strong> kết quả
                  </>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-base-content/70">
              Sắp xếp
              <select
                value={params.sort ?? ''}
                onChange={(e) => patchParams({ sort: e.target.value })}
                className="select select-bordered select-sm"
              >
                <option value="">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </label>
          </div>

          {/* Chip lọc đang áp dụng */}
          {(params.q || activeCategory || hasPrice) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {params.q && <FilterChip label={`Tìm: ${params.q}`} onClear={() => patchParams({ q: '' })} />}
              {activeCategory && (
                <FilterChip label={activeCategory} onClear={() => patchParams({ category: '' })} />
              )}
              {hasPrice && (
                <FilterChip
                  label={`Giá: ${priceLabel}`}
                  onClear={() => patchParams({ price_min: '', price_max: '' })}
                />
              )}
            </div>
          )}

          {isPending && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <BookCardSkeleton key={i} />
              ))}
            </div>
          )}

          {isError && <div className="alert alert-error">Không tải được danh sách sách</div>}

          {data && data.items.length === 0 && (
            <EmptyState
              icon={<SearchX size={40} />}
              title="Không tìm thấy sách nào"
              description="Thử đổi từ khoá hoặc bỏ bớt bộ lọc."
            />
          )}

          {data && data.items.length > 0 && (
            <>
              {isFetching && !isPending && (
                <div className="mb-3 text-sm text-base-content/70 flex items-center gap-2">
                  <span className="loading loading-spinner loading-xs" />
                  Đang cập nhật danh sách sách...
                </div>
              )}
              <div
                className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity ${
                  isFetching && !isPending ? 'opacity-80' : ''
                }`}
              >
                {data.items.map((book, index) => (
                  <BookCard key={book.id} book={book} priority={index < 4} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onChange={(page) => patchParams({ page: String(page) })}
                />
              </div>

              {/* Kết quả quá ít → gợi ý thêm sách khác, tránh trang trống lạc lõng (desktop) */}
              {showSuggestions && suggestionItems.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-serif text-xl font-semibold text-base-content mb-4">
                    Có thể bạn cũng thích
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {suggestionItems.map((book, index) => (
                      <BookCard key={book.id} book={book} priority={index < 2} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Drawer bộ lọc (mobile) — backdrop bấm ra ngoài để đóng + panel trượt lên từ đáy màn hình */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-box bg-base-100 pt-3 px-3 pb-6">
            {/* Tay cầm kéo + nút đóng — BookFilters bên dưới đã tự có tiêu đề "Bộ lọc" riêng nên
                không lặp lại tiêu đề ở đây */}
            <div className="flex justify-end mb-1">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Đóng bộ lọc"
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X size={18} />
              </button>
            </div>
            <BookFilters key={filtersKey} {...filtersProps} />
          </div>
        </div>
      )}
    </div>
  )
}
