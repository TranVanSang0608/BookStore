import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createCategoryApi,
  deleteCategoryApi,
  fetchCategories,
  updateCategoryApi,
  type Category,
  type CategoryInput,
} from '../../api/categories'
import { getApiErrorMessage } from '../../api/client'
import AdminModal from '../../components/AdminModal'

export default function AdminCategoriesPage() {
  // editing: null = đang tạo mới | Category = đang sửa thể loại đó
  const [editing, setEditing] = useState<Category | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const { data: categories, isPending } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  function resetForm() {
    setEditing(null)
    setName('')
    setDescription('')
    setError('')
  }

  // Mở modal: tạo mới (form rỗng) hoặc sửa (điền sẵn) — không phải cuộn lên form ở đầu trang nữa
  function openCreate() {
    resetForm()
    setModalOpen(true)
  }
  function openEdit(category: Category) {
    setEditing(category)
    setName(category.name)
    setDescription(category.description ?? '')
    setError('')
    setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  const onSuccess = () => {
    // Tên thể loại còn nằm trong cache chi tiết sách (badge) và form sách admin;
    // xóa thể loại còn đổi kết quả list public đang lọc theo nó → invalidate cả nhóm
    for (const key of ['categories', 'books', 'book', 'admin-book']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
    setModalOpen(false)
    resetForm()
  }
  const onError = (err: unknown) => setError(getApiErrorMessage(err))

  const saveMutation = useMutation({
    mutationFn: (input: CategoryInput) =>
      editing === null ? createCategoryApi(input) : updateCategoryApi(editing.id, input),
    onSuccess,
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryApi,
    onSuccess,
    onError,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="card-title font-serif">Quản lý thể loại</h1>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + Thêm thể loại
          </button>
        </div>

        {/* Lỗi xóa (modal đóng) hiện trên trang; lỗi lưu hiện trong modal */}
        {error && !modalOpen && <div className="alert alert-error text-sm">{error}</div>}

        {isPending && <span className="loading loading-spinner" />}

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Slug</th>
                <th>Mô tả</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-base-content/70">{c.slug}</td>
                  <td>{c.description}</td>
                  <td className="whitespace-nowrap">
                    <button className="link link-primary mr-3" onClick={() => openEdit(c)}>
                      Sửa
                    </button>
                    <button
                      className="link link-error"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        // Xóa thể loại chỉ gỡ nhãn khỏi sách (junction cascade), không mất sách
                        if (window.confirm(`Xóa thể loại "${c.name}"? Sách thuộc thể loại này sẽ mất nhãn.`))
                          deleteMutation.mutate(c.id)
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
        title={editing ? `Sửa thể loại: ${editing.name}` : 'Thêm thể loại'}
      >
        {error && <div className="alert alert-error text-sm mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="form-control">
            <span className="label-text mb-1">Tên thể loại</span>
            <input
              className="input input-bordered w-full"
              placeholder="Tên thể loại"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Mô tả (không bắt buộc)</span>
            <input
              className="input input-bordered w-full"
              placeholder="Mô tả ngắn"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saveMutation.isPending}>
              {editing ? 'Lưu' : 'Thêm'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  )
}
