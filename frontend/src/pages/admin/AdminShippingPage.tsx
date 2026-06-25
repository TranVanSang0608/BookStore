import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import {
  fetchAdminShippingZones,
  updateShippingZoneApi,
  type ShippingZone,
} from '../../api/shipping'
import { formatPrice } from '../../lib/format'

// 1 dòng = 1 tỉnh. State NHẬP cục bộ (useState từ props, khởi tạo 1 lần) để mỗi dòng sửa
// độc lập; nút Lưu chỉ bật khi có thay đổi so với giá trị server.
function ZoneRow({ zone }: { zone: ShippingZone }) {
  const queryClient = useQueryClient()
  const [fee, setFee] = useState(String(zone.fee))
  const [threshold, setThreshold] = useState(
    zone.free_threshold == null ? '' : String(zone.free_threshold),
  )
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      updateShippingZoneApi(zone.province_code, {
        fee: Number(fee) || 0,
        free_threshold: threshold.trim() ? Number(threshold) : null,
      }),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-zones'] })
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  })

  // So với giá trị server để biết có thay đổi chưa lưu không
  const thresholdNum = threshold.trim() ? Number(threshold) : null
  const changed = Number(fee) !== zone.fee || thresholdNum !== zone.free_threshold

  return (
    <tr className="hover">
      <td className="font-medium whitespace-nowrap">{zone.province_name}</td>
      <td>
        <input
          type="number"
          min={0}
          className="input input-bordered input-sm w-28"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          min={0}
          placeholder="Không miễn phí"
          className="input input-bordered input-sm w-36"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </td>
      <td className="whitespace-nowrap">
        <button
          className="btn btn-primary btn-xs"
          disabled={!changed || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Lưu
        </button>
        {error && <span className="text-error text-xs ml-2">{error}</span>}
      </td>
    </tr>
  )
}

export default function AdminShippingPage() {
  const [filter, setFilter] = useState('')
  const { data: zones, isPending } = useQuery({
    queryKey: ['admin-shipping-zones'],
    queryFn: fetchAdminShippingZones,
  })

  const keyword = filter.trim().toLowerCase()
  const filtered = zones?.filter((z) => z.province_name.toLowerCase().includes(keyword))

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <h1 className="card-title font-serif">Phí vận chuyển theo tỉnh</h1>
        <p className="text-sm text-base-content/70">
          Phí ship tính theo TỈNH NHẬN HÀNG của khách. Bỏ trống ô "Miễn phí từ" nghĩa là tỉnh đó
          không áp dụng miễn phí ship.
        </p>

        <input
          type="search"
          className="input input-bordered input-sm w-64"
          placeholder="Lọc theo tên tỉnh..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        {isPending && <span className="loading loading-spinner" />}

        {filtered && (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Tỉnh / Thành phố</th>
                  <th>Phí ship (đ)</th>
                  <th>Miễn phí từ (đ)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((zone) => (
                  <ZoneRow key={zone.province_code} zone={zone} />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-base-content/70 py-6 text-center">Không tìm thấy tỉnh phù hợp</p>
            )}
          </div>
        )}

        {zones && (
          <p className="text-xs text-base-content/60">
            Ví dụ: phí {formatPrice(35000)} với ngưỡng miễn phí {formatPrice(300000)} nghĩa là đơn từ
            300.000đ trở lên được miễn phí ship.
          </p>
        )}
      </div>
    </div>
  )
}
