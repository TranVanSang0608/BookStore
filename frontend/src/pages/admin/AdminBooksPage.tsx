import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminBooks, setBookActiveApi } from '../../api/books'
import CoverImage from '../../features/catalog/CoverImage'
import Pagination from '../../features/catalog/Pagination'
import { formatPrice } from '../../lib/format'

export default function AdminBooksPage() {
  // Bảng admin dùng state cục bộ (không cần URL share được như trang public)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('') // giá trị đã bấm "Tìm" — q là giá trị đang gõ
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['admin-books', { search, page }],
    queryFn: () => fetchAdminBooks({ q: search, page: String(page), limit: '10' }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      setBookActiveApi(id, isActive),
    onSuccess: () => {
      // Sách đổi trạng thái ảnh hưởng cả bảng admin lẫn trang public đang cache
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(q.trim())
    setPage(1)
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="card-title">Quản lý sách {data && `(${data.total})`}</h1>
          <Link to="/admin/books/new" className="btn btn-primary btn-sm">
            + Thêm sách
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="search"
            className="input input-bordered input-sm w-64"
            placeholder="Tìm theo tên sách, tác giả..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn btn-sm">
            Tìm
          </button>
        </form>

        {isPending && <span className="loading loading-spinner" />}

        {data && (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Bìa</th>
                  <th>Tên sách</th>
                  <th>Tác giả</th>
                  <th>Giá</th>
                  <th>Kho</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <CoverImage
                        url={book.cover_image_url}
                        title={book.title}
                        className="w-10 h-14 rounded"
                      />
                    </td>
                    <td className="font-medium">{book.title}</td>
                    <td>{book.author.name}</td>
                    <td>{formatPrice(book.price)}</td>
                    <td>{book.stock_quantity}</td>
                    <td>
                      {book.is_active ? (
                        <span className="badge badge-success badge-sm">Đang bán</span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">Đang ẩn</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <Link to={`/admin/books/${book.id}/edit`} className="link link-primary mr-3">
                        Sửa
                      </Link>
                      <button
                        className="link"
                        disabled={toggleMutation.isPending}
                        onClick={() =>
                          toggleMutation.mutate({ id: book.id, isActive: !book.is_active })
                        }
                      >
                        {book.is_active ? 'Ẩn' : 'Hiện'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </div>
    </div>
  )
}
