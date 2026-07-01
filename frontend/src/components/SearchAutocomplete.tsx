import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBooks } from '../api/books'
import { formatPrice } from '../lib/format'

// Ô tìm kiếm CÓ GỢI Ý. Gõ ≥ 2 ký tự → sau 250ms ngừng gõ mới gọi /api/books?q=...&limit=6
// → hiện tối đa 6 sách khớp ngay dưới ô. Tái dùng fetchBooks (endpoint đã có) nên KHÔNG cần API mới.
// Dùng chung cho navbar desktop + menu mobile (onNavigate để đóng menu mobile sau khi chọn)
// và hero trang chủ (variant="hero": ô to hơn, nền base-100, có nút submit "Tìm sách").
export default function SearchAutocomplete({
  className = '',
  variant = 'navbar',
  onNavigate,
}: {
  className?: string
  variant?: 'navbar' | 'hero'
  onNavigate?: () => void
}) {
  const isHero = variant === 'hero'
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Debounce: chỉ cập nhật từ khóa "đã chốt" sau 250ms ngừng gõ → tránh gọi API mỗi phím
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 250)
    return () => clearTimeout(id)
  }, [q])

  const enabled = debouncedQ.length >= 2
  const { data, isFetching } = useQuery({
    queryKey: ['search-suggest', debouncedQ],
    queryFn: () => fetchBooks({ q: debouncedQ, limit: '6' }),
    enabled,
    placeholderData: keepPreviousData, // giữ kết quả cũ khi gõ tiếp → dropdown không nhấp nháy
  })
  const suggestions = enabled ? (data?.items ?? []) : []

  // Bấm ra ngoài ô + dropdown thì đóng gợi ý
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Điều hướng + dọn trạng thái (đóng dropdown, xóa ô, đóng menu mobile nếu có)
  function go(to: string) {
    setOpen(false)
    setQ('')
    onNavigate?.()
    navigate(to)
  }

  // Enter / submit → ra trang kết quả đầy đủ
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const term = q.trim()
    go(term ? `/books?q=${encodeURIComponent(term)}` : '/books')
  }

  const showDropdown = open && enabled

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={handleSubmit}
        className={
          isHero
            ? 'flex items-center gap-2 bg-base-100 text-base-content border border-base-300 rounded-full p-1.5 pl-5 shadow-sm'
            : 'flex items-center gap-2 bg-base-200 border border-base-300 rounded-full px-4 py-2'
        }
      >
        <Search size={isHero ? 18 : 17} className="text-base-content/70 shrink-0" />
        <input
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          aria-label="Tìm sách"
          placeholder={isHero ? 'Tên sách, tác giả…' : 'Tìm tên sách, tác giả…'}
          autoComplete="off"
          className="bg-transparent outline-none w-full text-sm"
        />
        {isHero && (
          <button type="submit" className="btn btn-primary rounded-full">
            Tìm sách
          </button>
        )}
      </form>

      {/* text-base-content đặt tường minh: trong hero, context là text-neutral-content (chữ sáng)
          → nếu để kế thừa, tên sách sẽ gần như tàng hình trên nền base-100 */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-base-100 text-base-content border border-base-300 rounded-box shadow-lg z-50 overflow-hidden">
          {isFetching && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-base-content/70 flex items-center gap-2">
              <span className="loading loading-spinner loading-xs" /> Đang tìm…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-base-content/70">Không tìm thấy sách phù hợp</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {suggestions.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => go(`/books/${b.slug}`)}
                    className="w-full text-left px-4 py-2 hover:bg-base-200 flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{b.title}</span>
                      <span className="block text-xs text-base-content/70 truncate">{b.author.name}</span>
                    </span>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {formatPrice(b.price)}
                    </span>
                  </button>
                </li>
              ))}
              {/* Hàng cuối: ra trang kết quả đầy đủ cho từ khóa hiện tại */}
              <li className="border-t border-base-300">
                <button
                  type="button"
                  onClick={() => go(`/books?q=${encodeURIComponent(debouncedQ)}`)}
                  className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-base-200 font-medium"
                >
                  Xem tất cả kết quả cho “{debouncedQ}”
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
