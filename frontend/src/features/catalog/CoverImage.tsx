import { BookOpen } from 'lucide-react'

interface Props {
  url: string | null
  title: string
  className?: string
}

// Ảnh bìa sách với fallback đẹp: sách chưa có ảnh hiện ô màu giấy + icon sách + tên sách.
// Icon co theo bề rộng ô (w-1/4, chặn 16–40px) nên gọn cả ở thumbnail nhỏ lẫn thẻ to.
export default function CoverImage({ url, title, className = '' }: Props) {
  if (!url) {
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
  // loading="lazy": trình duyệt chỉ tải ảnh khi sắp cuộn tới — trang list nhiều sách nhẹ hơn
  return <img src={url} alt={title} loading="lazy" className={`object-cover ${className}`} />
}
