import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  deleteAddressApi,
  fetchAddresses,
  setDefaultAddressApi,
  type Address,
} from '../../api/addresses'
import AddressForm from './AddressForm'

export default function AddressBook() {
  // showForm: null = đóng form | 'new' = thêm mới | Address = đang sửa địa chỉ đó
  const [showForm, setShowForm] = useState<'new' | Address | null>(null)
  const queryClient = useQueryClient()

  const { data: addresses, isPending } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['addresses'] })

  const deleteMutation = useMutation({ mutationFn: deleteAddressApi, onSuccess: invalidate })
  const defaultMutation = useMutation({ mutationFn: setDefaultAddressApi, onSuccess: invalidate })

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Sổ địa chỉ</h2>
          {showForm === null && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm('new')}>
              + Thêm địa chỉ
            </button>
          )}
        </div>

        {isPending && <span className="loading loading-spinner" />}

        {addresses?.length === 0 && showForm === null && (
          <p className="text-base-content/60">Chưa có địa chỉ nào — thêm để đặt hàng nhanh hơn.</p>
        )}

        <div className="space-y-3">
          {addresses?.map((addr) => (
            <div key={addr.id} className="border border-base-300 rounded-box p-4 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{addr.recipient_name}</span>
                <span className="text-base-content/60">| {addr.phone}</span>
                {addr.is_default && <span className="badge badge-primary badge-sm">Mặc định</span>}
              </div>
              <p className="text-sm text-base-content/80">
                {addr.street_detail}, {addr.ward_name}, {addr.province_name}
              </p>
              <div className="flex gap-3 text-sm pt-1">
                <button className="link link-primary" onClick={() => setShowForm(addr)}>
                  Sửa
                </button>
                {!addr.is_default && (
                  <>
                    <button
                      className="link"
                      onClick={() => defaultMutation.mutate(addr.id)}
                      disabled={defaultMutation.isPending}
                    >
                      Đặt mặc định
                    </button>
                    <button
                      className="link link-error"
                      onClick={() => {
                        // confirm() đơn giản đủ dùng cho đồ án — xóa là thao tác không hoàn tác
                        if (window.confirm('Xóa địa chỉ này?')) deleteMutation.mutate(addr.id)
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Xóa
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {showForm !== null && (
          <AddressForm
            initial={showForm === 'new' ? undefined : showForm}
            onClose={() => setShowForm(null)}
          />
        )}
      </div>
    </div>
  )
}
