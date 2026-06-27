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
import AdminModal from '../../components/AdminModal'

export default function AdminAuthorsPage() {
  // editing: null = đang tạo mới | AuthorOption = đang sửa tác giả đó
  const [editing, setEditing] = useState<AuthorOption | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [bioLoading, setBioLoading] = useState(false) // tải tiểu sử khi mở sửa
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

  function openCreate() {
    resetForm()
    setModalOpen(true)
  }
  // Sửa: mở modal NGAY (hiện tên có sẵn từ list), rồi tải tiểu sử (bio) đổ vào sau —
  // list chỉ trả id+name, bio phải gọi detail mới có (D — endpoint list gọn).
  async function openEdit(author: AuthorOption) {
    setError('')
    setEditing(author)
    setName(author.name)
    setBio('')
    setBioLoading(true)
    setModalOpen(true)
    try {
      const detail = await fetchAuthor(author.id)
      setBio(detail.bio ?? '')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBioLoading(false)
    }
  }
  function closeModal() {
    setModalOpen(false)
    setBioLoading(false)
    resetForm()
  }

  const onSuccess = () => {
    // Tên tác giả hiện ở NHIỀU cache khác nhau: dropdown form admin (authors),
    // trang tác giả (author), card sách public (books), chi tiết sách (book),
    // bảng + form sách admin (admin-books, admin-book) — đổi tên là phải invalidate hết,
    // nếu không demo sẽ thấy tên cũ ở trang public cho tới khi cache hết hạn
    for (const key of ['authors', 'author', 'books', 'book', 'admin-books', 'admin-book']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
    setModalOpen(false)
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate({ name: name.trim(), bio: bio.trim() || undefined })
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="card-title font-serif">Quản lý tác giả</h1>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + Thêm tác giả
          </button>
        </div>

        {error && !modalOpen && <div className="alert alert-error text-sm">{error}</div>}

        {isPending && <span className="loading loading-spinner" />}

        <div className="overflow-x-auto">
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
                    <button className="link link-primary mr-3" onClick={() => openEdit(a)}>
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

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Sửa tác giả: ${editing.name}` : 'Thêm tác giả'}
      >
        {error && <div className="alert alert-error text-sm mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="form-control">
            <span className="label-text mb-1">Tên tác giả</span>
            <input
              className="input input-bordered w-full"
              placeholder="Tên tác giả"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">
              Tiểu sử (không bắt buộc)
              {bioLoading && <span className="loading loading-spinner loading-xs ml-2 align-middle" />}
            </span>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              placeholder={bioLoading ? 'Đang tải tiểu sử...' : 'Vài dòng về tác giả'}
              disabled={bioLoading}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={saveMutation.isPending || bioLoading}
            >
              {editing ? 'Lưu' : 'Thêm'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  )
}
