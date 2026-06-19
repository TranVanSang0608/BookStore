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

// Thể loại chỉ có 2 field → form inline ngay trên trang, không cần trang/modal riêng
export default function AdminCategoriesPage() {
  // editing: null = đang tạo mới | Category = đang sửa thể loại đó
  const [editing, setEditing] = useState<Category | null>(null)
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

  const onSuccess = () => {
    // Tên thể loại còn nằm trong cache chi tiết sách (badge) và form sách admin;
    // xóa thể loại còn đổi kết quả list public đang lọc theo nó → invalidate cả nhóm
    for (const key of ['categories', 'books', 'book', 'admin-book']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
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

  function startEdit(category: Category) {
    setEditing(category)
    setName(category.name)
    setDescription(category.description ?? '')
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate({ name: name.trim(), description: description.trim() || undefined })
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <h1 className="card-title font-serif">Quản lý thể loại</h1>

        {error && <div className="alert alert-error text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <label className="form-control">
            <span className="label-text mb-1">{editing ? `Sửa: ${editing.name}` : 'Thêm thể loại'}</span>
            <input
              className="input input-bordered input-sm w-48"
              placeholder="Tên thể loại"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <input
            className="input input-bordered input-sm w-64"
            placeholder="Mô tả (không bắt buộc)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                <td className="text-base-content/60">{c.slug}</td>
                <td>{c.description}</td>
                <td className="whitespace-nowrap">
                  <button className="link link-primary mr-3" onClick={() => startEdit(c)}>
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
  )
}
