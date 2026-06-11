import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../../api/health'

// Trang chủ tạm thời của Phase 0/1 — Phase 2 sẽ thay bằng trang chủ thật
// (navbar đã chuyển vào components/Layout dùng chung cho mọi trang)
export default function HomePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <div className="hero py-20">
      <div className="hero-content text-center">
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-bold">Nhà sách trực tuyến</h1>
          <p className="text-base-content/70">
            Phase 1 — Auth đang hoàn thiện. Trang chủ thật sẽ được xây ở Phase 2.
          </p>

          {isPending && <span className="loading loading-spinner loading-lg" />}

          {isError && (
            <div className="alert alert-error">
              Không gọi được API — kiểm tra backend đã chạy ở cổng 3000 chưa.
            </div>
          )}

          {data && (
            <div className="flex gap-2 justify-center">
              <span className="badge badge-success">API: online</span>
              <span
                className={`badge ${data.database === 'connected' ? 'badge-success' : 'badge-error'}`}
              >
                Database: {data.database}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
