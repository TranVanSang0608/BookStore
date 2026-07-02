import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import {
  createVoucherApi,
  deleteVoucherApi,
  fetchAdminVouchers,
  toggleVoucherApi,
  updateVoucherApi,
  type DiscountType,
  type Voucher,
  type VoucherFormInput,
} from '../../api/vouchers'
import AdminModal from '../../components/AdminModal'
import { formatPrice } from '../../lib/format'

// Form giữ mọi field dạng STRING (input HTML trả string); đổi sang số khi build payload.
const EMPTY = {
  code: '',
  discount_type: 'percentage' as DiscountType,
  discount_value: '',
  min_order: '0',
  max_discount: '',
  expire_at: '',
  usage_limit: '',
  per_user_limit: '1',
  is_active: true,
}

const VOUCHER_STATUS_CHECKED_AT = Date.now()

export default function AdminVouchersPage() {
  const [editing, setEditing] = useState<Voucher | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const { data: vouchers, isPending } = useQuery({
    queryKey: ['admin-vouchers'],
    queryFn: fetchAdminVouchers,
  })

  function resetForm() {
    setEditing(null)
    setForm(EMPTY)
    setError('')
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-vouchers'] })
  const onError = (err: unknown) => setError(getApiErrorMessage(err))

  const saveMutation = useMutation({
    mutationFn: (payload: VoucherFormInput) =>
      editing === null ? createVoucherApi(payload) : updateVoucherApi(editing.id, payload),
    onSuccess: () => {
      invalidate()
      setModalOpen(false)
      resetForm()
    },
    onError,
  })
  const toggleMutation = useMutation({ mutationFn: toggleVoucherApi, onSuccess: invalidate, onError })
  const deleteMutation = useMutation({
    mutationFn: deleteVoucherApi,
    onSuccess: () => {
      invalidate()
      resetForm()
    },
    onError,
  })

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => (Object.is(prev[k], v) ? prev : { ...prev, [k]: v }))
  }

  function openCreate() {
    resetForm()
    setModalOpen(true)
  }
  function openEdit(v: Voucher) {
    setEditing(v)
    setForm({
      code: v.code,
      discount_type: v.discount_type,
      discount_value: String(v.discount_value),
      min_order: String(v.min_order),
      max_discount: v.max_discount == null ? '' : String(v.max_discount),
      expire_at: v.expire_at ? v.expire_at.slice(0, 10) : '',
      usage_limit: v.usage_limit == null ? '' : String(v.usage_limit),
      per_user_limit: String(v.per_user_limit),
      is_active: v.is_active,
    })
    setError('')
    setModalOpen(true)
  }
  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate({
      code: form.code.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order: Number(form.min_order) || 0,
      max_discount: form.max_discount.trim() ? Number(form.max_discount) : null,
      // Hết hạn = CUỐI ngày theo giờ local (không có 'Z' → JS parse theo local), tránh mã chết
      // sớm gần 1 ngày: 'YYYY-MM-DD' trơn bị hiểu là nửa đêm UTC = 7h sáng VN (đầu ngày)
      expire_at: form.expire_at ? new Date(`${form.expire_at}T23:59:59`).toISOString() : null,
      usage_limit: form.usage_limit.trim() ? Number(form.usage_limit) : null,
      per_user_limit: Number(form.per_user_limit) || 1,
      is_active: form.is_active,
    })
  }

  // Hiển thị mức giảm gọn trong bảng
  function discountLabel(v: Voucher) {
    return v.discount_type === 'percentage'
      ? `${v.discount_value}%${v.max_discount ? ` (tối đa ${formatPrice(v.max_discount)})` : ''}`
      : formatPrice(v.discount_value)
  }

  function voucherStatus(v: Voucher) {
    const expired = v.expire_at ? new Date(v.expire_at).getTime() < VOUCHER_STATUS_CHECKED_AT : false
    if (expired) return { label: 'Hết hạn', badge: 'badge-error', disabled: true }
    if (v.is_active) return { label: 'Bật', badge: 'badge-success', disabled: false }
    return { label: 'Tắt', badge: 'badge-ghost', disabled: false }
  }

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="card-title font-serif">Quản lý mã giảm giá</h1>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            + Thêm mã
          </button>
        </div>

        {error && !modalOpen && <div className="alert alert-error text-sm">{error}</div>}

        {isPending && <span className="loading loading-spinner" />}

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Giảm</th>
                <th>Đơn tối thiểu</th>
                <th>Đã dùng / tổng</th>
                <th>Lượt/user</th>
                <th>Hết hạn</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vouchers?.map((v) => {
                const status = voucherStatus(v)
                return (
                // Cả dòng bấm được để mở modal sửa; các nút thao tác chặn nổi bọt
                <tr key={v.id} className="hover cursor-pointer" onClick={() => openEdit(v)}>
                  <td className="font-mono font-medium">{v.code}</td>
                  <td>{discountLabel(v)}</td>
                  <td>{v.min_order > 0 ? formatPrice(v.min_order) : '—'}</td>
                  <td>
                    {v.used_count} / {v.usage_limit ?? '∞'}
                  </td>
                  <td>{v.per_user_limit}</td>
                  <td>{v.expire_at ? v.expire_at.slice(0, 10) : '—'}</td>
                  <td>
                    <button
                      className={`badge whitespace-nowrap ${status.badge}`}
                      disabled={toggleMutation.isPending || status.disabled}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleMutation.mutate(v.id)
                      }}
                    >
                      {status.label}
                    </button>
                  </td>
                  <td className="whitespace-nowrap">
                    <button
                      className="link link-primary mr-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(v)
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="link link-error"
                      disabled={deleteMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Xóa mã "${v.code}"?`)) deleteMutation.mutate(v.id)
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? `Sửa mã: ${editing.code}` : 'Thêm mã giảm giá'}
        className="max-w-2xl"
      >
        {error && <div className="alert alert-error text-sm mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="form-control sm:col-span-2">
            <span className="label-text mb-1">Mã</span>
            <input
              className="input input-bordered w-full"
              placeholder="VD: WELCOME10"
              required
              autoFocus
              value={form.code}
              onInput={(e) => setField('code', e.currentTarget.value)}
              onChange={(e) => setField('code', e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Loại giảm</span>
            <select
              className="select select-bordered w-full"
              value={form.discount_type}
              onInput={(e) => setField('discount_type', e.currentTarget.value as DiscountType)}
              onChange={(e) => setField('discount_type', e.target.value as DiscountType)}
            >
              <option value="percentage">Phần trăm</option>
              <option value="fixed">Số tiền</option>
            </select>
          </label>

          <label className="form-control">
            <span className="label-text mb-1">{form.discount_type === 'percentage' ? 'Giảm (%)' : 'Giảm (đ)'}</span>
            <input
              className="input input-bordered w-full"
              type="number"
              required
              value={form.discount_value}
              onInput={(e) => setField('discount_value', e.currentTarget.value)}
              onChange={(e) => setField('discount_value', e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Đơn tối thiểu (đ)</span>
            <input
              className="input input-bordered w-full"
              type="number"
              value={form.min_order}
              onInput={(e) => setField('min_order', e.currentTarget.value)}
              onChange={(e) => setField('min_order', e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Trần giảm (đ)</span>
            <input
              className="input input-bordered w-full"
              type="number"
              placeholder="Không giới hạn"
              value={form.max_discount}
              onInput={(e) => setField('max_discount', e.currentTarget.value)}
              onChange={(e) => setField('max_discount', e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Hết hạn</span>
            <input
              className="input input-bordered w-full"
              type="date"
              value={form.expire_at}
              onInput={(e) => setField('expire_at', e.currentTarget.value)}
              onChange={(e) => setField('expire_at', e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Tổng lượt (trống = ∞)</span>
            <input
              className="input input-bordered w-full"
              type="number"
              placeholder="∞"
              value={form.usage_limit}
              onInput={(e) => setField('usage_limit', e.currentTarget.value)}
              onChange={(e) => setField('usage_limit', e.target.value)}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Lượt / user</span>
            <input
              className="input input-bordered w-full"
              type="number"
              value={form.per_user_limit}
              onInput={(e) => setField('per_user_limit', e.currentTarget.value)}
              onChange={(e) => setField('per_user_limit', e.target.value)}
            />
          </label>

          <label className="label cursor-pointer gap-2 sm:col-span-2 justify-start">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={form.is_active}
              onInput={(e) => setField('is_active', e.currentTarget.checked)}
              onChange={(e) => setField('is_active', e.target.checked)}
            />
            <span className="label-text">Đang bật</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
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
