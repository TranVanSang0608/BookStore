import { useQuery } from '@tanstack/react-query'
import { SearchX, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchBooks } from '../../api/books'
import { fetchCategories } from '../../api/categories'
import EmptyState from '../../components/EmptyState'
import BookCard from '../../features/catalog/BookCard'
import BookCardSkeleton from '../../features/catalog/BookCardSkeleton'
import BookFilters from '../../features/catalog/BookFilters'
import Pagination from '../../features/catalog/Pagination'
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

  // queryKey chứa params → đổi filter là key đổi → React Query tự fetch lại
  const { data, isPending, isError } = useQuery({
    queryKey: ['books', params],
    queryFn: () => fetchBooks(params),
  })

  // Danh sách thể loại gần như không đổi trong 1 phiên → staleTime Infinity khỏi fetch lại
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  })

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <nav aria-label="Breadcrumb" className="text-sm text-base-content/50 mb-2 flex gap-2 items-center">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>›</span>
        <span className="text-base-content/70">Tất cả sách</span>
      </nav>
      <h1 className="font-serif text-3xl font-semibold text-base-content">Kho sách</h1>
      <p className="text-base-content/60 mt-1 mb-6">Lọc nhanh theo thể loại và mức giá.</p>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* key = state cục bộ của BookFilters (ô search + khoảng giá): URL đổi mà không qua
            form (Back/Forward, link share, bấm chip ở trang chi tiết) → key đổi → BookFilters
            remount đọc lại value mới. Category là controlled nên tự sync, không cần key. */}
        <BookFilters
          key={`${params.q ?? ''}|${params.price_min ?? ''}|${params.price_max ?? ''}`}
          categories={categories ?? []}
          value={{
            q: params.q ?? '',
            category: params.category ?? '',
            price_min: params.price_min ?? '',
            price_max: params.price_max ?? '',
            sort: params.sort ?? '',
          }}
          onChange={patchParams}
        />

        <div>
          {/* Thanh công cụ: số kết quả + sắp xếp */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="text-sm text-base-content/60">
              {data && (
                <>
                  Hiển thị <strong className="text-base-content">{data.total}</strong> kết quả
                </>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-base-content/60">
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
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.items.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onChange={(page) => patchParams({ page: String(page) })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
