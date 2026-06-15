import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchAddresses } from '../../api/addresses'
import { fetchCart } from '../../api/cart'
import { getApiErrorMessage } from '../../api/client'
import { createOrderApi } from '../../api/orders'
import { fetchShippingFee } from '../../api/shipping'
import { previewVoucherApi, type VoucherPreview } from '../../api/vouchers'
import { formatPrice } from '../../lib/format'

// Trang checkout: chọn địa chỉ → xem phí ship theo zone + tổng tiền → đặt đơn (COD).
// Route này nằm trong RequireAuth (checkout bắt buộc đăng nhập — D2).
export default function CheckoutPage() {
  // pickedId = địa chỉ user CHỦ ĐỘNG bấm chọn; null = chưa bấm gì
  const [pickedId, setPickedId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay'>('cod')
  // Voucher (Phase 7): ô nhập + mã đã áp (preview từ server). null = chưa áp mã nào.
  const [voucherCode, setVoucherCode] = useState('')
  const [applied, setApplied] = useState<VoucherPreview | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
  const discount = applied?.discount ?? 0
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

  // Đặt đơn: BE tự tính lại tiền + trừ kho trong transaction (FE chỉ gửi address + note + phương thức).
  // Thành công → dọn cache giỏ (BE đã xóa giỏ); VNPay thì redirect sang cổng, COD thì sang chi tiết đơn.
  // Áp mã giảm giá: gọi preview (BE validate + tính discount từ giỏ DB). OK → lưu lại.
  const voucherMutation = useMutation({
    mutationFn: () => previewVoucherApi(voucherCode.trim()),
    onSuccess: (data) => setApplied(data),
  })

  const orderMutation = useMutation({
    mutationFn: () =>
      createOrderApi({
        address_id: selected!.id,
        note: note.trim() || undefined,
        payment_method: paymentMethod,
        voucher_code: applied?.code, // BE validate + tính lại discount (không tin FE)
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      if (order.payment_url) {
        // VNPay: rời SPA sang trang thanh toán VNPay (full page redirect, không dùng router)
        window.location.href = order.payment_url
      } else {
        navigate(`/orders/${order.order_code}`)
      }
    },
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

            {/* Mã giảm giá (Phase 7) — áp xong server trả số tiền giảm; BE vẫn validate lại lúc đặt */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Mã giảm giá</p>
              {applied ? (
                <div className="flex items-center justify-between gap-2 text-sm bg-success/10 rounded-box px-3 py-2">
                  <span>
                    Đã áp <span className="font-semibold">{applied.code}</span> — giảm{' '}
                    {formatPrice(applied.discount)}
                  </span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      setApplied(null)
                      setVoucherCode('')
                    }}
                  >
                    Bỏ
                  </button>
                </div>
              ) : (
                <div className="join w-full">
                  <input
                    className="input input-bordered input-sm join-item flex-1"
                    placeholder="Nhập mã (vd WELCOME10)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-outline join-item"
                    disabled={!voucherCode.trim() || voucherMutation.isPending}
                    onClick={() => voucherMutation.mutate()}
                  >
                    {voucherMutation.isPending && <span className="loading loading-spinner loading-xs" />}
                    Áp dụng
                  </button>
                </div>
              )}
              {voucherMutation.isError && !applied && (
                <p className="text-error text-sm">{getApiErrorMessage(voucherMutation.error)}</p>
              )}
            </div>

            <div className="divider my-1" />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Giảm giá{applied ? ` (${applied.code})` : ''}</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
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
                  {fee ? formatPrice(subtotal + fee.shipping_fee - discount) : '—'}
                </span>
              </div>
            </div>

            {/* Hình thức thanh toán: COD hoặc VNPay */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Hình thức thanh toán</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  className="radio radio-sm radio-primary"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                />
                <span className="text-sm">Thanh toán khi nhận hàng (COD)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  className="radio radio-sm radio-primary"
                  checked={paymentMethod === 'vnpay'}
                  onChange={() => setPaymentMethod('vnpay')}
                />
                <span className="text-sm">Thanh toán online qua VNPay</span>
              </label>
            </div>

            <label className="form-control">
              <span className="label-text mb-1">Ghi chú (không bắt buộc)</span>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={2}
                placeholder="Ví dụ: giao giờ hành chính"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>

            {orderMutation.isError && (
              <div className="alert alert-error text-sm">{getApiErrorMessage(orderMutation.error)}</div>
            )}

            {/* Chặn đặt khi: giỏ có vấn đề, chưa chọn địa chỉ, phí ship chưa tính xong, hoặc đang gửi */}
            <button
              className="btn btn-primary w-full"
              disabled={hasProblem || !selected || !fee || orderMutation.isPending}
              onClick={() => orderMutation.mutate()}
            >
              {orderMutation.isPending && <span className="loading loading-spinner loading-sm" />}
              {paymentMethod === 'vnpay' ? 'Đặt hàng & thanh toán VNPay' : 'Đặt hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
