import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title?: string
  description?: string
  onRetry?: () => void
  retrying?: boolean
  icon?: ReactNode
}

// Trạng thái LỖI dùng chung (song song với EmptyState): icon + thông báo + nút "Thử lại".
// Dùng khi một query thất bại để UI KHÔNG "trống im lặng" — người dùng biết là lỗi và bấm thử lại được.
export default function ErrorState({
  title = 'Không tải được dữ liệu',
  description = 'Có thể do mạng chập chờn. Bạn thử lại nhé.',
  onRetry,
  retrying,
  icon,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="text-error/70 mb-3">{icon ?? <AlertTriangle size={40} />}</div>
      <p className="font-serif text-xl text-base-content/80">{title}</p>
      <p className="text-sm text-base-content/70 mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <button onClick={onRetry} disabled={retrying} className="btn btn-outline btn-sm mt-4 gap-2">
          {retrying && <span className="loading loading-spinner loading-xs" />}
          Thử lại
        </button>
      )}
    </div>
  )
}
