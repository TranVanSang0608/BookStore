import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import {
  fetchAdminShippingZones,
  fetchShippingConfig,
  updateShippingConfigApi,
  updateShippingZoneApi,
  type ShippingConfig,
  type ShippingZone,
} from '../../api/shipping'
import { formatPrice } from '../../lib/format'

// ---------- Cấu hình kho + công thức (chế độ tính phí theo km — D62) ----------
function ConfigForm({ initial }: { initial: ShippingConfig }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    warehouse_lat: String(initial.warehouse_lat),
    warehouse_lng: String(initial.warehouse_lng),
    base_fee: String(initial.base_fee),
    per_km_fee: String(initial.per_km_fee),
    free_km: String(initial.free_km),
    free_threshold: initial.free_threshold == null ? '' : String(initial.free_threshold),
    max_fee: initial.max_fee == null ? '' : String(initial.max_fee),
    road_factor: String(initial.road_factor),
    enabled: initial.enabled,
  })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      updateShippingConfigApi({
        warehouse_lat: Number(form.warehouse_lat),
        warehouse_lng: Number(form.warehouse_lng),
        base_fee: Number(form.base_fee) || 0,
        per_km_fee: Number(form.per_km_fee) || 0,
        free_km: Number(form.free_km) || 0,
        free_threshold: form.free_threshold.trim() ? Number(form.free_threshold) : null,
        max_fee: form.max_fee.trim() ? Number(form.max_fee) : null,
        road_factor: Number(form.road_factor) || 1,
        enabled: form.enabled,
      }),
    onSuccess: () => {
      setError('')
      setSaved(true)
      // Lưu xong backend tự tính lại distance/fee 34 tỉnh → refresh bảng + config
      queryClient.invalidateQueries({ queryKey: ['shipping-config'] })
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-zones'] })
    },
    onError: (e) => {
      setError(getApiErrorMessage(e))
      setSaved(false)
    },
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }))
    setSaved(false)
  }

  // Khai báo các ô số để render gọn (lưới)
  const numFields: { key: keyof typeof form; label: string; placeholder?: string }[] = [
    { key: 'base_fee', label: 'Phí nền (đ)' },
    { key: 'per_km_fee', label: 'Phí mỗi km vượt (đ/km)' },
    { key: 'free_km', label: 'Số km đầu miễn (gồm trong nền)' },
    { key: 'free_threshold', label: 'Miễn phí từ (đ) — toàn hệ thống', placeholder: 'Không miễn phí' },
    { key: 'max_fee', label: 'Trần phí (đ)', placeholder: 'Không trần' },
    { key: 'road_factor', label: 'Hệ số đường bộ (×)' },
  ]

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-3">
      {error && <div className="alert alert-error text-sm">{error}</div>}
      {saved && <div className="alert alert-success text-sm">Đã lưu + tính lại khoảng cách 34 tỉnh ✓</div>}

      {/* Công tắc bật chế độ */}
      <label className="flex items-center gap-3 cursor-pointer rounded-box border border-base-300 p-3">
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={form.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        <span className="text-sm">
          <span className="font-medium">Tính phí theo khoảng cách</span>{' '}
          {form.enabled ? (
            <span className="text-success">(đang BẬT)</span>
          ) : (
            <span className="text-base-content/60">(đang tắt — dùng phí vùng cố định bên dưới)</span>
          )}
        </span>
      </label>

      {/* Vị trí kho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="form-control">
          <span className="label-text mb-1">Vĩ độ kho (lat)</span>
          <input type="number" step="any" className="input input-bordered input-sm" value={form.warehouse_lat} onChange={(e) => set('warehouse_lat', e.target.value)} required />
        </label>
        <label className="form-control">
          <span className="label-text mb-1">Kinh độ kho (lng)</span>
          <input type="number" step="any" className="input input-bordered input-sm" value={form.warehouse_lng} onChange={(e) => set('warehouse_lng', e.target.value)} required />
        </label>
      </div>

      {/* Công thức */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {numFields.map((f) => (
          <label key={f.key} className="form-control">
            <span className="label-text mb-1">{f.label}</span>
            <input
              type="number"
              min={0}
              step="any"
              className="input input-bordered input-sm"
              placeholder={f.placeholder}
              value={form[f.key] as string}
              onChange={(e) => set(f.key, e.target.value as (typeof form)[typeof f.key])}
            />
          </label>
        ))}
      </div>

      <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
        {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
        Lưu cấu hình & tính lại khoảng cách
      </button>
    </form>
  )
}

// ---------- 1 dòng tỉnh: sửa phí/ngưỡng DỰ PHÒNG + xem khoảng cách & phí theo km ----------
function ZoneRow({ zone }: { zone: ShippingZone }) {
  const queryClient = useQueryClient()
  const [fee, setFee] = useState(String(zone.fee))
  const [threshold, setThreshold] = useState(zone.free_threshold == null ? '' : String(zone.free_threshold))
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

  const thresholdNum = threshold.trim() ? Number(threshold) : null
  const changed = Number(fee) !== zone.fee || thresholdNum !== zone.free_threshold

  return (
    <tr className="hover">
      <td className="font-medium whitespace-nowrap">{zone.province_name}</td>
      <td>
        <input type="number" min={0} className="input input-bordered input-sm w-24" value={fee} onChange={(e) => setFee(e.target.value)} />
      </td>
      <td>
        <input type="number" min={0} placeholder="—" className="input input-bordered input-sm w-32" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
      </td>
      <td className="whitespace-nowrap text-sm">{zone.distance_km != null ? `${zone.distance_km} km` : '—'}</td>
      <td className="whitespace-nowrap text-sm font-medium">{zone.distance_fee != null ? formatPrice(zone.distance_fee) : '—'}</td>
      <td className="whitespace-nowrap">
        <button className="btn btn-primary btn-xs" disabled={!changed || mutation.isPending} onClick={() => mutation.mutate()}>
          Lưu
        </button>
        {error && <span className="text-error text-xs ml-2">{error}</span>}
      </td>
    </tr>
  )
}

export default function AdminShippingPage() {
  const [filter, setFilter] = useState('')
  const { data: config, isPending: configPending } = useQuery({
    queryKey: ['shipping-config'],
    queryFn: fetchShippingConfig,
  })
  const { data: zones, isPending: zonesPending } = useQuery({
    queryKey: ['admin-shipping-zones'],
    queryFn: fetchAdminShippingZones,
  })

  const keyword = filter.trim().toLowerCase()
  const filtered = zones?.filter((z) => z.province_name.toLowerCase().includes(keyword))

  return (
    <div className="space-y-4">
      {/* Khu cấu hình kho + công thức */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body space-y-3">
          <h1 className="card-title font-serif">Phí vận chuyển</h1>
          <p className="text-sm text-base-content/70">
            <span className="font-medium">Chế độ khoảng cách:</span> phí = phí nền + (km vượt × phí/km),
            chặn trần, miễn phí theo ngưỡng toàn hệ thống. Khoảng cách = ước lượng từ kho tới tâm tỉnh
            nhận (×hệ số đường bộ). <span className="font-medium">Tắt</span> hoặc tỉnh chưa có khoảng cách
            → tự dùng <span className="font-medium">phí vùng cố định</span> (bảng bên dưới).
          </p>
          {configPending && <span className="loading loading-spinner" />}
          {config && <ConfigForm initial={config} />}
        </div>
      </div>

      {/* Bảng phí theo tỉnh */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body space-y-4">
          <h2 className="card-title font-serif text-base">Phí theo tỉnh</h2>
          <input
            type="search"
            className="input input-bordered input-sm w-64"
            placeholder="Lọc theo tên tỉnh..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {zonesPending && <span className="loading loading-spinner" />}
          {filtered && (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Tỉnh / Thành phố</th>
                    <th>Phí dự phòng (đ)</th>
                    <th>Miễn phí dự phòng từ (đ)</th>
                    <th>Khoảng cách</th>
                    <th>Phí theo km</th>
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
          <p className="text-xs text-base-content/60">
            "Phí dự phòng" + "Miễn phí dự phòng" chỉ áp dụng khi chế độ khoảng cách tắt / tỉnh chưa có
            khoảng cách. "Phí theo km" là phí ước tính cho đơn nhỏ ở chế độ khoảng cách.
          </p>
        </div>
      </div>
    </div>
  )
}
