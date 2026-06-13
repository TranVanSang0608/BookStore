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

// Bộ lọc trang /books. Hai kiểu áp dụng:
// - select (thể loại, sắp xếp): đổi là lọc ngay
// - ô text (tìm kiếm, khoảng giá): gõ xong bấm "Lọc" / Enter mới áp dụng
//   (giữ state cục bộ để không gọi API theo từng phím gõ)
export default function BookFilters({ categories, value, onChange }: Props) {
  const [q, setQ] = useState(value.q)
  const [priceMin, setPriceMin] = useState(value.price_min)
  const [priceMax, setPriceMax] = useState(value.price_max)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onChange({ q: q.trim(), price_min: priceMin, price_max: priceMax })
  }

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow">
      <div className="card-body p-4 flex-row flex-wrap items-end gap-3">
        <label className="form-control">
          <span className="label-text mb-1">Tìm kiếm</span>
          <input
            type="search"
            className="input input-bordered w-56"
            placeholder="Tên sách hoặc tác giả..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Thể loại</span>
          <select
            className="select select-bordered"
            value={value.category}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            <option value="">Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Giá từ (đ)</span>
          <input
            type="number"
            min={0}
            className="input input-bordered w-32"
            placeholder="0"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Đến (đ)</span>
          <input
            type="number"
            min={0}
            className="input input-bordered w-32"
            placeholder="500.000"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </label>

        <label className="form-control">
          <span className="label-text mb-1">Sắp xếp</span>
          <select
            className="select select-bordered"
            value={value.sort}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            <option value="">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary">
          Lọc
        </button>
      </div>
    </form>
  )
}
