interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

// Phân trang kiểu DaisyUI "join" — quy mô đồ án (vài chục sách) nên hiện đủ mọi nút số
export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null // 1 trang thì không cần phân trang

  return (
    <div className="join justify-center w-full">
      <button className="join-item btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        «
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          className={`join-item btn ${p === page ? 'btn-active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="join-item btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        »
      </button>
    </div>
  )
}
