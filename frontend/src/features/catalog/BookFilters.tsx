import { Search } from 'lucide-react'
import { useState } from 'react'
import type { Category } from '../../api/categories'

interface FilterValues {
  q: string
  category: string
  price_min: string
  price_max: string
  sort: string
}

interface Props {
  categories: Category[]
  value: FilterValues
  onChange: (patch: Partial<FilterValues>) => void
}

// Bộ lọc trang /books — dạng sidebar dọc (Giai đoạn E).
// - Thể loại: bấm là lọc NGAY (controlled theo value.category)
// - Ô tìm + khoảng giá: gõ xong Enter / bấm "Áp dụng" mới lọc (state cục bộ,
//   không gọi API theo từng phím). Sắp xếp nằm ở thanh công cụ bên phải (BookListPage).
export default function BookFilters({ categories, value, onChange }: Props) {
  const [q, setQ] = useState(value.q)
  const [priceMin, setPriceMin] = useState(value.price_min)
  const [priceMax, setPriceMax] = useState(value.price_max)

  function applyText(e?: React.FormEvent) {
    e?.preventDefault()
    onChange({ q: q.trim(), price_min: priceMin, price_max: priceMax })
  }

  const hasActive = !!(value.q || value.category || value.price_min || value.price_max)

  function clearAll() {
    setQ('')
    setPriceMin('')
    setPriceMax('')
    onChange({ q: '', category: '', price_min: '', price_max: '' })
  }

  function catBtnClass(active: boolean) {
    return `w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm border transition-colors ${
      active
        ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
        : 'border-transparent hover:bg-base-200 text-base-content/80'
    }`
  }

  return (
    <aside className="bg-base-100 border border-base-300 rounded-box p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold text-base-content">Bộ lọc</h2>
        {hasActive && (
          <button onClick={clearAll} className="text-xs font-semibold text-secondary hover:underline">
            Xóa lọc
          </button>
        )}
      </div>

      {/* Tìm trong kết quả */}
      <form onSubmit={applyText} className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">
          Tìm trong kết quả
        </div>
        <div className="flex items-center gap-2 bg-base-200 border border-base-300 rounded-lg px-3 py-2">
          <Search size={15} className="text-base-content/50 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tên sách, tác giả…"
            aria-label="Tìm trong kết quả"
            className="bg-transparent outline-none w-full text-sm"
          />
        </div>
      </form>

      {/* Thể loại — bấm lọc ngay */}
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">
          Thể loại
        </div>
        <ul className="flex flex-col gap-1">
          <li>
            <button onClick={() => onChange({ category: '' })} className={catBtnClass(value.category === '')}>
              <span>Tất cả</span>
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onChange({ category: c.slug })}
                className={catBtnClass(value.category === c.slug)}
              >
                <span>{c.name}</span>
                {c.book_count !== undefined && (
                  <span className="text-xs text-base-content/45">{c.book_count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Khoảng giá */}
      <form onSubmit={applyText}>
        <div className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">
          Khoảng giá (đ)
        </div>
        <div className="flex gap-2 mb-2">
          <input
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            aria-label="Giá từ"
            className="input input-bordered input-sm w-1/2"
          />
          <input
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            inputMode="numeric"
            placeholder="500.000"
            aria-label="Giá đến"
            className="input input-bordered input-sm w-1/2"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm w-full">
          Áp dụng
        </button>
      </form>
    </aside>
  )
}
