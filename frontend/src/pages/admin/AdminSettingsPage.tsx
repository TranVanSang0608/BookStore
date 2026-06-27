import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { fetchSiteSettings, updateSiteSettingsApi, type SiteSettings } from '../../api/settings'

// Form con nhận `initial` qua props + useState(initial) khởi tạo 1 lần lúc mount
// (tránh anti-pattern setState trong useEffect — xem review vòng 2). Trang ngoài lo TẢI.
function SettingsForm({ initial }: { initial: SiteSettings }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () => updateSiteSettingsApi(form),
    onSuccess: (data) => {
      // Cập nhật cache ['site-settings'] để Footer/Navbar đổi NGAY, không chờ refetch
      queryClient.setQueryData(['site-settings'], data)
      setError('')
      setSaved(true)
    },
    onError: (e) => {
      setError(getApiErrorMessage(e))
      setSaved(false)
    },
  })

  function set<K extends keyof SiteSettings>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  const fields = [
    { key: 'shop_hotline' as const, label: 'Hotline', icon: Phone, placeholder: '1900 1234' },
    { key: 'shop_email' as const, label: 'Email liên hệ', icon: Mail, placeholder: 'hello@shop.vn' },
    { key: 'shop_address' as const, label: 'Địa chỉ', icon: MapPin, placeholder: '123 Lê Lợi, Q.1, TP.HCM' },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      {/* Cột trái: form chỉnh sửa */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="alert alert-error text-sm">{error}</div>}
        {saved && <div className="alert alert-success text-sm">Đã lưu thông tin shop ✓</div>}

        {fields.map(({ key, label, icon: Icon, placeholder }) => (
          <label key={key} className="form-control">
            <span className="label-text mb-1">{label}</span>
            <span className="input input-bordered flex items-center gap-2">
              <Icon size={16} className="opacity-60 shrink-0" />
              <input
                className="grow"
                required
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </span>
          </label>
        ))}

        <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
          {mutation.isPending && <span className="loading loading-spinner loading-sm" />}
          Lưu thay đổi
        </button>
      </form>

      {/* Cột phải: xem trước đúng cách hiển thị ở chân trang (footer) */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-base-content/70">Xem trước (khối "Liên hệ" ở footer)</p>
        <div className="bg-neutral text-neutral-content rounded-box p-5 space-y-2 text-sm">
          <p className="font-semibold text-base">Liên hệ</p>
          <p className="flex items-center gap-2">
            <Phone size={15} className="opacity-80 shrink-0" />
            Hotline: {form.shop_hotline || '—'}
          </p>
          <p className="flex items-center gap-2 break-all">
            <Mail size={15} className="opacity-80 shrink-0" />
            {form.shop_email || '—'}
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={15} className="opacity-80 shrink-0" />
            {form.shop_address || '—'}
          </p>
        </div>
        <p className="text-xs text-base-content/60">
          Thay đổi cập nhật ngay ở footer + thanh đầu trang sau khi lưu.
        </p>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  const { data, isPending } = useQuery({ queryKey: ['site-settings'], queryFn: fetchSiteSettings })

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <div>
          <h1 className="card-title font-serif">Thông tin shop</h1>
          <p className="text-sm text-base-content/70">
            Các thông tin này hiển thị ở chân trang (footer) và thanh đầu trang của cửa hàng.
          </p>
        </div>

        {isPending && <span className="loading loading-spinner" />}
        {data && <SettingsForm initial={data} />}
      </div>
    </div>
  )
}
