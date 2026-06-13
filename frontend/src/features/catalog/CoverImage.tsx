interface Props {
  url: string | null
  title: string
  className?: string
}

// Ảnh bìa sách với fallback: sách chưa có ảnh hiện ô xám cùng kích thước
// (mọi sách đều có thể thiếu bìa — cover_image_url cho phép null trong DB)
export default function CoverImage({ url, title, className = '' }: Props) {
  if (!url) {
    return (
      <div
        className={`bg-base-200 flex items-center justify-center text-base-content/30 ${className}`}
        aria-label={`Chưa có ảnh bìa: ${title}`}
      >
        <span className="text-4xl">📖</span>
      </div>
    )
  }
  // loading="lazy": trình duyệt chỉ tải ảnh khi sắp cuộn tới — trang list nhiều sách nhẹ hơn
  return <img src={url} alt={title} loading="lazy" className={`object-cover ${className}`} />
}
