import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import {
  fetchAdminShippingZones,
  fetchShippingConfig,
  updateShippingConfigApi,
  updateShippingZonesBatchApi,
  type ShippingConfig,
  type ShippingZone,
} from '../../api/shipping'
import MoneyInput from '../../components/MoneyInput'
import { formatPrice } from '../../lib/format'

// Nhãn kèm icon tooltip (giải thích chi tiết khỏi nhồi hết vào nhãn)
function LabelTip({ text, tip }: { text: string; tip: string }) {
  return (
    <span className="label-text mb-1 flex items-center gap-1">
      {text}
      <span className="tooltip tooltip-right" data-tip={tip}>
        <Info size={13} className="opacity-50" />
      </span>
    </span>
  )
}

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

  // Kiểm tra logic chéo → cảnh báo; chặn lưu nếu sai cứng (BE Zod cũng chặn)
  const baseFee = Number(form.base_fee) || 0
  const maxFee = form.max_fee.trim() ? Number(form.max_fee) : null
  const freeThr = form.free_threshold.trim() ? Number(form.free_threshold) : null
  const roadFactor = Number(form.road_factor) || 0
  const warnings: string[] = []
  if (maxFee != null && maxFee < baseFee) warnings.push('Trần phí đang THẤP HƠN phí nền → mọi phí sẽ bằng trần.')
  const badThreshold = form.free_threshold.trim() !== '' && (freeThr ?? 0) <= 0
  const badRoad = roadFactor < 1
  if (badThreshold) warnings.push('Ngưỡng miễn phí phải > 0 (để trống nếu không miễn phí).')
  if (badRoad) warnings.push('Hệ số đường bộ phải ≥ 1.')
  const blocking = badThreshold || badRoad

  const mutation = useMutation({
    mutationFn: () =>
      updateShippingConfigApi({
        warehouse_lat: Number(form.warehouse_lat),
        warehouse_lng: Number(form.warehouse_lng),
        base_fee: baseFee,
        per_km_fee: Number(form.per_km_fee) || 0,
        free_km: Number(form.free_km) || 0,
        free_threshold: freeThr,
        max_fee: maxFee,
        road_factor: roadFactor || 1,
        enabled: form.enabled,
      }),
    onSuccess: () => {
      setError('')
      setSaved(true)
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

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-3">
      {error && <div className="alert alert-error text-sm">{error}</div>}
      {saved && <div className="alert alert-success text-sm">Đã lưu + tính lại khoảng cách 34 tỉnh ✓</div>}
      {warnings.length > 0 && (
        <div className="alert alert-warning text-sm flex-col items-start gap-0.5">
          {warnings.map((w, i) => (
            <span key={i}>⚠ {w}</span>
          ))}
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer rounded-box border border-base-300 p-3">
        <input type="checkbox" className="toggle toggle-primary" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
        <span className="text-sm">
          <span className="font-medium">Tính phí theo khoảng cách</span>{' '}
          {form.enabled ? <span className="text-success">(đang BẬT)</span> : <span className="text-base-content/60">(đang tắt — dùng phí vùng cố định)</span>}
        </span>
      </label>

      {/* Vị trí kho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="form-control">
          <LabelTip text="Vĩ độ kho" tip="Latitude của kho hàng (vd HCM ≈ 10.82)" />
          <input type="number" step="any" className="input input-bordered input-sm" value={form.warehouse_lat} onChange={(e) => set('warehouse_lat', e.target.value)} required />
        </label>
        <label className="form-control">
          <LabelTip text="Kinh độ kho" tip="Longitude của kho hàng (vd HCM ≈ 106.63)" />
          <input type="number" step="any" className="input input-bordered input-sm" value={form.warehouse_lng} onChange={(e) => set('warehouse_lng', e.target.value)} required />
        </label>
      </div>

      {/* Công thức — nhãn ngắn + tooltip, ô tiền có dấu phân cách + "đ" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="form-control">
          <LabelTip text="Phí nền" tip="Phí tối thiểu, đã gồm số km miễn phí đầu" />
          <MoneyInput value={form.base_fee} onChange={(v) => set('base_fee', v)} />
        </label>
        <label className="form-control">
          <LabelTip text="Phí mỗi km vượt" tip="Cộng thêm cho mỗi km vượt quá số km miễn phí" />
          <MoneyInput value={form.per_km_fee} onChange={(v) => set('per_km_fee', v)} />
        </label>
        <label className="form-control">
          <LabelTip text="Số km miễn phí" tip="Số km đầu đã gồm trong phí nền, không tính thêm" />
          <input type="number" min={0} className="input input-bordered input-sm" value={form.free_km} onChange={(e) => set('free_km', e.target.value)} />
        </label>
        <label className="form-control">
          <LabelTip text="Miễn phí từ" tip="Đơn từ mức này được miễn phí ship (toàn hệ thống). Để trống nếu không áp dụng" />
          <MoneyInput value={form.free_threshold} onChange={(v) => set('free_threshold', v)} placeholder="Không miễn phí" />
        </label>
        <label className="form-control">
          <LabelTip text="Trần phí" tip="Phí tối đa, chặn tỉnh quá xa. Để trống nếu không chặn" />
          <MoneyInput value={form.max_fee} onChange={(v) => set('max_fee', v)} placeholder="Không trần" />
        </label>
        <label className="form-control">
          <LabelTip text="Hệ số đường bộ" tip="Nhân với khoảng cách chim bay để xấp xỉ đường bộ (≈ 1.3)" />
          <input type="number" min={1} step="0.1" className="input input-bordered input-sm" value={form.road_factor} onChange={(e) => set('road_factor', e.target.value)} />
        </label>
      </div>

      <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending || blocking}>
        {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
        Lưu cấu hình & tính lại khoảng cách
      </button>
    </form>
  )
}

// ---------- Bảng phí theo tỉnh: sửa nhiều dòng + "Lưu tất cả" + dirty ----------
type Draft = { fee: string; threshold: string }
const buildDrafts = (zones: ShippingZone[]): Record<string, Draft> =>
  Object.fromEntries(
    zones.map((z) => [z.province_code, { fee: String(z.fee), threshold: z.free_threshold == null ? '' : String(z.free_threshold) }]),
  )

function ZonesTable({ zones }: { zones: ShippingZone[] }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => buildDrafts(zones))
  const [error, setError] = useState('')

  const original = useMemo(() => new Map(zones.map((z) => [z.province_code, z])), [zones])

  function setDraft(code: string, field: keyof Draft, val: string) {
    setDrafts((d) => ({ ...d, [code]: { ...d[code], [field]: val } }))
  }

  // Dòng đã đổi so với dữ liệu gốc
  function isDirty(code: string): boolean {
    const z = original.get(code)
    const d = drafts[code]
    if (!z || !d) return false
    const tNum = d.threshold.trim() ? Number(d.threshold) : null
    return Number(d.fee || 0) !== z.fee || tNum !== z.free_threshold
  }
  const dirtyCodes = Object.keys(drafts).filter(isDirty)

  const saveMutation = useMutation({
    mutationFn: () =>
      updateShippingZonesBatchApi(
        dirtyCodes.map((code) => ({
          province_code: code,
          fee: Number(drafts[code].fee) || 0,
          free_threshold: drafts[code].threshold.trim() ? Number(drafts[code].threshold) : null,
        })),
      ),
    onSuccess: () => {
      setError('')
      queryClient.invalidateQueries({ queryKey: ['admin-shipping-zones'] })
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  })

  const keyword = filter.trim().toLowerCase()
  const filtered = zones.filter((z) => z.province_name.toLowerCase().includes(keyword))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <input
          type="search"
          className="input input-bordered input-sm w-56"
          placeholder="Lọc theo tên tỉnh..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          className="btn btn-primary btn-sm"
          disabled={dirtyCodes.length === 0 || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending && <span className="loading loading-spinner loading-sm" />}
          Lưu tất cả{dirtyCodes.length > 0 ? ` (${dirtyCodes.length})` : ''}
        </button>
      </div>
      {error && <div className="alert alert-error text-sm">{error}</div>}

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-base-100 z-10">Tỉnh</th>
              <th>Phí dự phòng</th>
              <th>Miễn phí dự phòng từ</th>
              <th>Khoảng cách</th>
              <th>Phí theo km</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((z) => {
              const d = drafts[z.province_code] ?? { fee: '', threshold: '' }
              const dirty = isDirty(z.province_code)
              return (
                <tr key={z.province_code} className={dirty ? 'bg-warning/10' : 'hover'}>
                  <td className={`font-medium whitespace-nowrap sticky left-0 z-10 ${dirty ? 'bg-warning/10' : 'bg-base-100'}`}>
                    {dirty && <span className="text-warning mr-1" title="Chưa lưu">●</span>}
                    {z.province_name}
                  </td>
                  <td>
                    <MoneyInput className="w-28" value={d.fee} onChange={(v) => setDraft(z.province_code, 'fee', v)} />
                  </td>
                  <td>
                    <MoneyInput className="w-32" value={d.threshold} onChange={(v) => setDraft(z.province_code, 'threshold', v)} placeholder="—" />
                  </td>
                  <td className="whitespace-nowrap text-sm">{z.distance_km != null ? `${z.distance_km} km` : '—'}</td>
                  <td className="whitespace-nowrap text-sm font-medium">{z.distance_fee != null ? formatPrice(z.distance_fee) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-base-content/70 py-6 text-center">Không tìm thấy tỉnh phù hợp</p>}
      </div>

      <p className="text-xs text-base-content/60">
        Chấm cam = dòng <span className="text-warning font-medium">chưa lưu</span>. "Phí/Miễn phí dự phòng"
        chỉ áp dụng khi chế độ khoảng cách tắt / tỉnh chưa có khoảng cách. "Phí theo km" là phí ước tính
        cho đơn nhỏ ở chế độ khoảng cách.
      </p>
    </div>
  )
}

export default function AdminShippingPage() {
  const { data: config, isPending: configPending } = useQuery({
    queryKey: ['shipping-config'],
    queryFn: fetchShippingConfig,
  })
  const { data: zones, isPending: zonesPending } = useQuery({
    queryKey: ['admin-shipping-zones'],
    queryFn: fetchAdminShippingZones,
  })

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body space-y-3">
          <h1 className="card-title font-serif">Phí vận chuyển</h1>
          <p className="text-sm text-base-content/70">
            <span className="font-medium">Chế độ khoảng cách:</span> phí = phí nền + (km vượt × phí/km),
            chặn trần, miễn phí theo ngưỡng toàn hệ thống. Khoảng cách = ước lượng từ kho tới tâm tỉnh nhận
            (×hệ số đường bộ). <span className="font-medium">Tắt</span> / tỉnh chưa có khoảng cách → dùng
            phí vùng cố định bên dưới.
          </p>
          {configPending && <span className="loading loading-spinner" />}
          {config && <ConfigForm initial={config} />}
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body space-y-4">
          <h2 className="card-title font-serif text-base">Phí theo tỉnh</h2>
          {zonesPending && <span className="loading loading-spinner" />}
          {zones && <ZonesTable zones={zones} />}
        </div>
      </div>
    </div>
  )
}
