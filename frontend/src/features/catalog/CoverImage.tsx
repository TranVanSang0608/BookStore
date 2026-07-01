import { BookOpen } from 'lucide-react'
import { useState } from 'react'

interface Props {
  url: string | null
  title: string
  className?: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
}

function CoverPlaceholder({ title, className = '' }: Pick<Props, 'title' | 'className'>) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 bg-base-300 p-2 text-center ${className}`}
      aria-label={`Chưa có ảnh bìa: ${title}`}
    >
      <BookOpen className="w-1/4 h-auto min-w-4 max-w-10 text-base-content/35" aria-hidden="true" />
      <span className="font-serif text-sm leading-tight line-clamp-3 text-base-content/70">
        {title}
      </span>
    </div>
  )
}

// Ảnh bìa sách với fallback đẹp: sách chưa có ảnh/lỗi ảnh hiện ô màu giấy + icon sách + tên sách.
// Khi ảnh thật đang tải, giữ skeleton đúng kích thước để sort/filter không tạo mảng nền trống.
export default function CoverImage({
  url,
  title,
  className = '',
  loading = 'lazy',
  fetchPriority = 'auto',
}: Props) {
  const [imageState, setImageState] = useState({ url, loaded: false, failed: false })
  const currentState =
    imageState.url === url ? imageState : { url, loaded: false, failed: false }

  if (!url || currentState.failed) {
    return <CoverPlaceholder title={title} className={className} />
  }

  // loading="lazy": trình duyệt chỉ tải ảnh khi sắp cuộn tới — trang list nhiều sách nhẹ hơn.
  // referrerPolicy="no-referrer": không gửi URL trang hiện tại khi tải ảnh (phòng rò referrer nếu
  // lỡ có URL ảnh ngoài) — backend đã chặn URL ngoài nhưng đây là lớp phòng thủ thêm phía client.
  return (
    <div className={`relative overflow-hidden bg-base-300 ${className}`} aria-busy={!currentState.loaded}>
      {!currentState.loaded && <div className="skeleton absolute inset-0 rounded-none" />}
      <img
        src={url}
        alt={title}
        loading={loading}
        fetchPriority={fetchPriority}
        referrerPolicy="no-referrer"
        onLoad={() => setImageState({ url, loaded: true, failed: false })}
        onError={() => setImageState({ url, loaded: false, failed: true })}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          currentState.loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
