import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchBooks } from '../../api/books'
import { fetchCategories } from '../../api/categories'
import BookCard from '../../features/catalog/BookCard'
import BookFilters from '../../features/catalog/BookFilters'
import Pagination from '../../features/catalog/Pagination'

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

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Tất cả sách</h1>

      {/* key = các giá trị nằm trong state cục bộ của BookFilters (ô search + khoảng giá).
          URL đổi mà không qua form (Back/Forward, mở link share, bấm badge thể loại ở trang
          chi tiết) → key đổi → BookFilters remount và đọc lại giá trị mới từ value.
          Category/sort là controlled component nên tự sync, không cần nằm trong key. */}
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

      {isPending && (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {isError && <div className="alert alert-error">Không tải được danh sách sách</div>}

      {data && data.items.length === 0 && (
        <p className="text-center py-20 text-base-content/60">Không tìm thấy sách nào</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="text-sm text-base-content/60">Tìm thấy {data.total} sách</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.items.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(page) => patchParams({ page: String(page) })}
          />
        </>
      )}
    </div>
  )
}
