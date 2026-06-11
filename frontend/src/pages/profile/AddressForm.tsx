import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createAddressApi,
  updateAddressApi,
  type Address,
  type AddressInput,
} from '../../api/addresses'
import { getApiErrorMessage } from '../../api/client'
import { fetchProvinces, fetchWards } from '../../api/locations'
import { addressFormSchema, zodErrorsToMap } from '../../lib/validation'

interface Props {
  initial?: Address // có = sửa, không có = thêm mới
  onClose: () => void
}

export default function AddressForm({ initial, onClose }: Props) {
  const [form, setForm] = useState<AddressInput>({
    recipient_name: initial?.recipient_name ?? '',
    phone: initial?.phone ?? '',
    province_code: initial?.province_code ?? '',
    ward_code: initial?.ward_code ?? '',
    street_detail: initial?.street_detail ?? '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()

  // Danh sách tỉnh gần như bất biến → staleTime Infinity: chỉ fetch 1 lần cho cả phiên
  const provincesQuery = useQuery({
    queryKey: ['provinces'],
    queryFn: fetchProvinces,
    staleTime: Infinity,
  })

  // Dropdown liên động: query wards CHỈ chạy khi đã chọn tỉnh (option "enabled").
  // Đổi tỉnh → queryKey đổi → React Query tự fetch danh sách xã mới
  const wardsQuery = useQuery({
    queryKey: ['wards', form.province_code],
    queryFn: () => fetchWards(form.province_code),
    enabled: form.province_code !== '',
    staleTime: Infinity,
  })

  const mutation = useMutation({
    mutationFn: (input: AddressInput) =>
      initial ? updateAddressApi(initial.id, input) : createAddressApi(input),
    onSuccess: () => {
      // Báo cache danh sách địa chỉ đã cũ → React Query tự refetch
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      onClose()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = addressFormSchema.safeParse(form)
    if (!result.success) {
      setFieldErrors(zodErrorsToMap(result.error))
      return
    }
    setFieldErrors({})
    mutation.mutate(result.data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-base-300 pt-4" noValidate>
      <h3 className="font-semibold">{initial ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</h3>

      {mutation.isError && (
        <div className="alert alert-error text-sm">{getApiErrorMessage(mutation.error)}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="recipient_name">
            Tên người nhận
          </label>
          <input
            id="recipient_name"
            className="input input-bordered w-full"
            value={form.recipient_name}
            onChange={(e) => setForm((p) => ({ ...p, recipient_name: e.target.value }))}
          />
          {fieldErrors.recipient_name && (
            <p className="text-error text-sm mt-1">{fieldErrors.recipient_name}</p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="addr_phone">
            Số điện thoại
          </label>
          <input
            id="addr_phone"
            type="tel"
            className="input input-bordered w-full"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          {fieldErrors.phone && <p className="text-error text-sm mt-1">{fieldErrors.phone}</p>}
        </div>

        <div>
          <label className="label" htmlFor="province">
            Tỉnh / Thành phố
          </label>
          <select
            id="province"
            className="select select-bordered w-full"
            value={form.province_code}
            onChange={(e) =>
              // Đổi tỉnh thì reset xã — xã cũ không còn thuộc tỉnh mới
              setForm((p) => ({ ...p, province_code: e.target.value, ward_code: '' }))
            }
          >
            <option value="">— Chọn tỉnh/thành phố —</option>
            {provincesQuery.data?.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          {fieldErrors.province_code && (
            <p className="text-error text-sm mt-1">{fieldErrors.province_code}</p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="ward">
            Phường / Xã
          </label>
          <select
            id="ward"
            className="select select-bordered w-full"
            value={form.ward_code}
            onChange={(e) => setForm((p) => ({ ...p, ward_code: e.target.value }))}
            disabled={form.province_code === '' || wardsQuery.isPending}
          >
            <option value="">
              {form.province_code === '' ? '— Chọn tỉnh trước —' : '— Chọn phường/xã —'}
            </option>
            {wardsQuery.data?.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
          {fieldErrors.ward_code && (
            <p className="text-error text-sm mt-1">{fieldErrors.ward_code}</p>
          )}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="street_detail">
          Số nhà, tên đường
        </label>
        <input
          id="street_detail"
          className="input input-bordered w-full"
          value={form.street_detail}
          onChange={(e) => setForm((p) => ({ ...p, street_detail: e.target.value }))}
        />
        {fieldErrors.street_detail && (
          <p className="text-error text-sm mt-1">{fieldErrors.street_detail}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
          {initial ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Hủy
        </button>
      </div>
    </form>
  )
}
