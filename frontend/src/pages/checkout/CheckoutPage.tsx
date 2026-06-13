import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAddresses } from '../../api/addresses'
import { fetchCart } from '../../api/cart'
import { fetchShippingFee } from '../../api/shipping'
import { formatPrice } from '../../lib/format'

// Trang checkout (Phase 3): chọn địa chỉ → xem phí ship theo zone + tổng tiền.
// Nút "Đặt hàng" thật (transaction tạo Order) thuộc Phase 4 — hiện disabled có ghi chú.
// Route này nằm trong RequireAuth (checkout bắt buộc đăng nhập — D2).
export default function CheckoutPage() {
  // pickedId = địa chỉ user CHỦ ĐỘNG bấm chọn; null = chưa bấm gì
  const [pickedId, setPickedId] = useState<number | null>(null)

  const { data: cart, isPending: cartPending } = useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
  })

  const { data: addresses, isPending: addressesPending } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  // Địa chỉ đang chọn là GIÁ TRỊ DẪN XUẤT từ pickedId + danh sách —
  // user chưa bấm thì lấy địa chỉ mặc định, không có default thì lấy địa chỉ đầu.
  // Không dùng useEffect + setState để "tự chọn sẵn" (bài học review vòng 2).
  const selected =
    addresses?.find((a) => a.id === pickedId) ??
    addresses?.find((a) => a.is_default) ??
    addresses?.[0]

  const subtotal = cart?.subtotal ?? 0
  const hasProblem = (cart?.items ?? []).some(
    (item) => !item.book.is_active || item.quantity > item.book.stock_quantity,
  )

  // Phí ship: queryKey chứa cả tỉnh lẫn subtotal — đổi địa chỉ sang tỉnh khác
  // (hoặc giỏ đổi tiền) là key đổi → React Query tự gọi lại API, không cần effect
  const { data: fee, isPending: feePending } = useQuery({
    queryKey: ['shipping-fee', selected?.province_code, subtotal],
    queryFn: () => fetchShippingFee(selected!.province_code, subtotal),
    enabled: selected !== undefined && subtotal > 0,
  })

  if (cartPending || addressesPending) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  // Giỏ rỗng → không có gì để đặt
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-16 space-y-2">
            <p className="text-base-content/60">Giỏ hàng đang trống — chưa có gì để đặt</p>
            <Link to="/books" className="btn btn-primary">
              Khám phá sách ngay
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Đặt hàng</h1>

      {hasProblem && (
        <div className="alert alert-warning text-sm">
          Giỏ có sách không còn bán hoặc vượt tồn kho —{' '}
          <Link to="/cart" className="link">
            quay lại giỏ hàng
          </Link>{' '}
          chỉnh trước khi đặt
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        {/* Cột trái: chọn địa chỉ giao hàng */}
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-3">
            <h2 className="card-title">Địa chỉ giao hàng</h2>

            {addresses?.length === 0 && (
              <div className="alert alert-info text-sm">
                Bạn chưa có địa chỉ nào —{' '}
                <Link to="/profile" className="link">
                  thêm địa chỉ trong tài khoản
                </Link>{' '}
                để đặt hàng
              </div>
            )}

            {addresses?.map((address) => (
              <label
                key={address.id}
                className={`border rounded-box p-3 flex gap-3 cursor-pointer ${
                  selected?.id === address.id ? 'border-primary' : 'border-base-300'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  className="radio radio-primary radio-sm mt-1"
                  checked={selected?.id === address.id}
                  onChange={() => setPickedId(address.id)}
                />
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold">
                    {address.recipient_name}{' '}
                    <span className="font-normal text-base-content/60">| {address.phone}</span>
                    {address.is_default && (
                      <span className="badge badge-primary badge-sm ml-2">Mặc định</span>
                    )}
                  </p>
                  <p className="text-base-content/80">
                    {address.street_detail}, {address.ward_name}, {address.province_name}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Cột phải: tóm tắt đơn + tổng tiền */}
        <div className="card bg-base-100 shadow">
          <div className="card-body space-y-3">
            <h2 className="card-title">Tóm tắt đơn hàng</h2>

            <ul className="space-y-1 text-sm">
              {cart.items.map((item) => (
                <li key={item.book_id} className="flex justify-between gap-2">
                  <span>
                    {item.book.title} <span className="text-base-content/60">× {item.quantity}</span>
                  </span>
                  <span className="whitespace-nowrap">
                    {formatPrice(item.book.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="divider my-1" />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển{selected ? ` (${selected.province_name})` : ''}</span>
                <span>
                  {!selected && '—'}
                  {selected && feePending && <span className="loading loading-spinner loading-xs" />}
                  {fee &&
                    (fee.free_shipping_applied ? (
                      <span className="text-success">Miễn phí</span>
                    ) : (
                      formatPrice(fee.shipping_fee)
                    ))}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-primary">
                  {fee ? formatPrice(subtotal + fee.shipping_fee) : '—'}
                </span>
              </div>
            </div>

            {/* Phase 4 sẽ thay disabled bằng mutation tạo Order (transaction trừ stock) */}
            <button className="btn btn-primary w-full" disabled>
              Đặt hàng
            </button>
            <p className="text-xs text-center text-base-content/50">
              Chức năng đặt hàng sẽ hoàn thiện ở Phase 4
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
