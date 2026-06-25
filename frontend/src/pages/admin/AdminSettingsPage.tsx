import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && <div className="alert alert-error text-sm">{error}</div>}
      {saved && <div className="alert alert-success text-sm">Đã lưu thông tin shop</div>}

      <label className="form-control">
        <span className="label-text mb-1">Hotline</span>
        <input
          className="input input-bordered"
          required
          value={form.shop_hotline}
          onChange={(e) => set('shop_hotline', e.target.value)}
        />
      </label>

      <label className="form-control">
        <span className="label-text mb-1">Email liên hệ</span>
        <input
          className="input input-bordered"
          required
          value={form.shop_email}
          onChange={(e) => set('shop_email', e.target.value)}
        />
      </label>

      <label className="form-control">
        <span className="label-text mb-1">Địa chỉ</span>
        <input
          className="input input-bordered"
          required
          value={form.shop_address}
          onChange={(e) => set('shop_address', e.target.value)}
        />
      </label>

      <button type="submit" className="btn btn-primary btn-sm" disabled={mutation.isPending}>
        Lưu thay đổi
      </button>
    </form>
  )
}

export default function AdminSettingsPage() {
  const { data, isPending } = useQuery({ queryKey: ['site-settings'], queryFn: fetchSiteSettings })

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body space-y-4">
        <h1 className="card-title font-serif">Thông tin shop</h1>
        <p className="text-sm text-base-content/70">
          Các thông tin này hiển thị ở chân trang (footer) và thanh đầu trang của cửa hàng.
        </p>

        {isPending && <span className="loading loading-spinner" />}
        {data && <SettingsForm initial={data} />}
      </div>
    </div>
  )
}
