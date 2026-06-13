import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createAuthorApi,
  deleteAuthorApi,
  fetchAuthor,
  fetchAuthors,
  updateAuthorApi,
  type AuthorOption,
  type AuthorInput,
} from '../../api/authors'
import { getApiErrorMessage } from '../../api/client'

export default function AdminAuthorsPage() {
  // editing: null = đang tạo mới | AuthorOption = đang sửa tác giả đó
  const [editing, setEditing] = useState<AuthorOption | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const { data: authors, isPending } = useQuery({
    queryKey: ['authors'],
    queryFn: fetchAuthors,
  })

  function resetForm() {
    setEditing(null)
    setName('')
    setBio('')
    setError('')
  }

  const onSuccess = () => {
    // Tên tác giả hiện ở NHIỀU cache khác nhau: dropdown form admin (authors),
    // trang tác giả (author), card sách public (books), chi tiết sách (book),
    // bảng + form sách admin (admin-books, admin-book) — đổi tên là phải invalidate hết,
    // nếu không demo sẽ thấy tên cũ ở trang public cho tới khi cache hết hạn
    for (const key of ['authors', 'author', 'books', 'book', 'admin-books', 'admin-book']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
    resetForm()
  }
  const onError = (err: unknown) => setError(getApiErrorMessage(err))

  const saveMutation = useMutation({
    mutationFn: (input: AuthorInput) =>
      editing === null ? createAuthorApi(input) : updateAuthorApi(editing.id, input),
    onSuccess,
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAuthorApi,
    onSuccess,
    onError,
  })

  async function startEdit(author: AuthorOption) {
    setError('')
    try {
      // List chỉ trả id+name (đủ cho dropdown) — bio phải gọi detail mới có.
      // Lấy bio TRƯỚC rồi mới đổ vào form, tránh ghi đè khi user đã bắt đầu gõ.
      const detail = await fetchAuthor(author.id)
      setEditing(author)
      setName(author.name)
      setBio(detail.bio ?? '')
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate({ name: name.trim(), bio: bio.trim() || undefined })
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body space-y-4">
        <h1 className="card-title">Quản lý tác giả</h1>

        {error && <div className="alert alert-error text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <label className="form-control">
            <span className="label-text mb-1">{editing ? `Sửa: ${editing.name}` : 'Thêm tác giả'}</span>
            <input
              className="input input-bordered input-sm w-48"
              placeholder="Tên tác giả"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <input
            className="input input-bordered input-sm w-64"
            placeholder="Tiểu sử (không bắt buộc)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={saveMutation.isPending}>
            {editing ? 'Lưu' : 'Thêm'}
          </button>
          {editing && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
              Hủy
            </button>
          )}
        </form>

        {isPending && <span className="loading loading-spinner" />}

        <table className="table table-sm">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {authors?.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td className="font-medium">{a.name}</td>
                <td className="whitespace-nowrap">
                  <button className="link link-primary mr-3" onClick={() => startEdit(a)}>
                    Sửa
                  </button>
                  <button
                    className="link link-error"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      // Backend chặn xóa tác giả còn sách — lỗi sẽ hiện qua alert phía trên
                      if (window.confirm(`Xóa tác giả "${a.name}"?`)) deleteMutation.mutate(a.id)
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
