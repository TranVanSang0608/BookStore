import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../../api/health'

// Trang chủ tạm thời của Phase 0: mục đích duy nhất là chứng minh
// FE ↔ BE ↔ DB thông nhau qua /api/health. Phase 2 sẽ thay bằng trang chủ thật.
export default function HomePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  })

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow">
        <span className="text-xl font-bold px-4">📚 BookStore</span>
      </div>

      <div className="hero py-20">
        <div className="hero-content text-center">
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-bold">Nhà sách trực tuyến</h1>
            <p className="text-base-content/70">
              Phase 0 — kiểm tra kết nối hệ thống. Trang chủ thật sẽ được xây ở Phase 2.
            </p>

            {isPending && <span className="loading loading-spinner loading-lg" />}

            {isError && (
              <div className="alert alert-error">
                Không gọi được API — kiểm tra backend đã chạy ở cổng 3000 chưa.
              </div>
            )}

            {data && (
              <div className="card bg-base-100 shadow">
                <div className="card-body items-center gap-3">
                  <p>{data.message}</p>
                  <div className="flex gap-2">
                    <span className="badge badge-success">API: online</span>
                    <span
                      className={`badge ${data.database === 'connected' ? 'badge-success' : 'badge-error'}`}
                    >
                      Database: {data.database}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
