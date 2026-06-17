// Hiển thị điểm sao trung bình (chỉ đọc). Làm tròn về số sao nguyên gần nhất cho đơn giản.
export default function Stars({ value, count }: { value: number; count?: number }) {
  const filled = Math.round(value)
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-warning" aria-label={`${value.toFixed(1)} trên 5 sao`}>
        {'★'.repeat(filled)}
        {'☆'.repeat(5 - filled)}
      </span>
      {count !== undefined && (
        <span className="text-base-content/50">
          {count > 0 ? `${value.toFixed(1)} (${count})` : 'Chưa có đánh giá'}
        </span>
      )}
    </span>
  )
}
