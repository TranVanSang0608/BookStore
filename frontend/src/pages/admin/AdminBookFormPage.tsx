import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAuthors } from '../../api/authors'
import {
  createBookApi,
  fetchAdminBook,
  updateBookApi,
  type AdminBookDetail,
  type BookInput,
} from '../../api/books'
import { fetchCategories } from '../../api/categories'
import { getApiErrorMessage } from '../../api/client'
import { uploadImageApi } from '../../api/uploads'
import CoverImage from '../../features/catalog/CoverImage'

// State form giữ mọi field dạng string (giá trị của <input>) —
// chỉ đổi sang số khi build payload gửi API
interface FormState {
  title: string
  description: string
  price: string
  stock_quantity: string
  author_id: string
  category_ids: number[]
  cover_image_url: string
  isbn: string
  publisher: string
  published_year: string
  language: string
  pages: string
}

const emptyForm: FormState = {
  title: '',
  description: '',
  price: '',
  stock_quantity: '0',
  author_id: '',
  category_ids: [],
  cover_image_url: '',
  isbn: '',
  publisher: '',
  published_year: '',
  language: '',
  pages: '',
}

function formFromBook(book: AdminBookDetail): FormState {
  return {
    title: book.title,
    description: book.description ?? '',
    price: String(book.price),
    stock_quantity: String(book.stock_quantity),
    author_id: String(book.author.id),
    category_ids: book.categories.map((c) => c.id),
    cover_image_url: book.cover_image_url ?? '',
    isbn: book.isbn ?? '',
    publisher: book.publisher ?? '',
    published_year: book.published_year ? String(book.published_year) : '',
    language: book.language ?? '',
    pages: book.pages ? String(book.pages) : '',
  }
}

// Trang form dùng chung cho 2 route: /admin/books/new (tạo) và /admin/books/:id/edit (sửa).
// Tách làm 2 tầng: tầng ngoài lo TẢI dữ liệu, tầng trong (BookForm) lo NHẬP liệu —
// BookForm nhận dữ liệu ban đầu qua props và useState khởi tạo đúng 1 lần lúc mount,
// nên dù query refetch (đổi tab, focus lại cửa sổ) cũng KHÔNG đè mất nội dung đang sửa dở.
// (Cách cũ dùng useEffect + setForm vừa vi phạm rule react-hooks/set-state-in-effect,
// vừa có rủi ro refetch reset form thật sự.)
export default function AdminBookFormPage() {
  const { id } = useParams()
  const editId = id ? Number(id) : null // null = chế độ tạo mới

  // Chế độ sửa: tải sách hiện tại trước khi render form
  const { data: book, isPending, isError } = useQuery({
    queryKey: ['admin-book', editId],
    queryFn: () => fetchAdminBook(editId!),
    enabled: editId !== null,
  })

  if (editId !== null && isPending) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (editId !== null && (isError || !book)) {
    return <div className="alert alert-error">Không tìm thấy sách</div>
  }

  // key={editId}: đổi sang sửa sách khác → BookForm remount → state khởi tạo lại từ initial
  return (
    <BookForm
      key={editId ?? 'new'}
      editId={editId}
      initial={book ? formFromBook(book) : emptyForm}
    />
  )
}

function BookForm({ editId, initial }: { editId: number | null; initial: FormState }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data: authors } = useQuery({ queryKey: ['authors'], queryFn: fetchAuthors })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  })

  const saveMutation = useMutation({
    mutationFn: (input: BookInput) =>
      editId === null ? createBookApi(input) : updateBookApi(editId, input),
    onSuccess: () => {
      // Dữ liệu sách đổi → mọi cache liên quan phải tải lại
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
      queryClient.invalidateQueries({ queryKey: ['admin-book', editId] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book'] })
      navigate('/admin/books')
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleCategory(catId: number) {
    setForm((prev) => ({
      ...prev,
      category_ids: prev.category_ids.includes(catId)
        ? prev.category_ids.filter((c) => c !== catId)
        : [...prev.category_ids, catId],
    }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      // Upload ngay khi chọn file → nhận URL Cloudinary, lưu vào form để gửi cùng payload
      const result = await uploadImageApi(file)
      set('cover_image_url', result.url)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    // Field optional bỏ trống → gửi undefined (Zod .optional() bên BE chấp nhận)
    saveMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity),
      author_id: Number(form.author_id),
      category_ids: form.category_ids,
      cover_image_url: form.cover_image_url || undefined,
      isbn: form.isbn.trim() || undefined,
      publisher: form.publisher.trim() || undefined,
      published_year: form.published_year ? Number(form.published_year) : undefined,
      language: form.language.trim() || undefined,
      pages: form.pages ? Number(form.pages) : undefined,
    })
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h1 className="card-title">{editId === null ? 'Thêm sách mới' : 'Sửa sách'}</h1>

        {error && <div className="alert alert-error text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <label className="form-control md:col-span-2">
              <span className="label-text mb-1">Tên sách *</span>
              <input
                className="input input-bordered w-full"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Giá (đ) *</span>
              <input
                type="number"
                min={1}
                className="input input-bordered w-full"
                required
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Tồn kho *</span>
              <input
                type="number"
                min={0}
                className="input input-bordered w-full"
                required
                value={form.stock_quantity}
                onChange={(e) => set('stock_quantity', e.target.value)}
              />
            </label>

            <label className="form-control md:col-span-2">
              <span className="label-text mb-1">Tác giả *</span>
              <select
                className="select select-bordered w-full"
                required
                value={form.author_id}
                onChange={(e) => set('author_id', e.target.value)}
              >
                <option value="" disabled>
                  -- Chọn tác giả --
                </option>
                {authors?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="space-y-1">
            <span className="label-text">Thể loại * (chọn ít nhất 1)</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {categories?.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={form.category_ids.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-end gap-4">
            <label className="form-control">
              <span className="label-text mb-1">Ảnh bìa (.jpg/.png/.webp, tối đa 2MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="file-input file-input-bordered"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            {uploading && <span className="loading loading-spinner" />}
            {form.cover_image_url && (
              <CoverImage url={form.cover_image_url} title="Xem trước" className="w-16 h-24 rounded" />
            )}
          </div>

          <label className="form-control">
            <span className="label-text mb-1">Mô tả</span>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="form-control">
              <span className="label-text mb-1">Nhà xuất bản</span>
              <input
                className="input input-bordered w-full"
                value={form.publisher}
                onChange={(e) => set('publisher', e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Năm xuất bản</span>
              <input
                type="number"
                className="input input-bordered w-full"
                value={form.published_year}
                onChange={(e) => set('published_year', e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Ngôn ngữ</span>
              <input
                className="input input-bordered w-full"
                placeholder="Tiếng Việt"
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">Số trang</span>
              <input
                type="number"
                min={1}
                className="input input-bordered w-full"
                value={form.pages}
                onChange={(e) => set('pages', e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="label-text mb-1">ISBN</span>
              <input
                className="input input-bordered w-full"
                value={form.isbn}
                onChange={(e) => set('isbn', e.target.value)}
              />
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saveMutation.isPending || uploading}
            >
              {saveMutation.isPending && <span className="loading loading-spinner loading-sm" />}
              {editId === null ? 'Tạo sách' : 'Lưu thay đổi'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/books')}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
