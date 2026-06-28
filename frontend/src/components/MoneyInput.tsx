// Ô nhập TIỀN: hiển thị có dấu phân cách nghìn (15.000) + hậu tố "đ" ngay trong ô cho dễ đọc.
// Lưu giá trị dạng CHUỖI CHỮ SỐ thuần ("15000" hoặc "" nếu rỗng) — parent tự ép Number khi gửi.
interface Props {
  value: string // chuỗi chữ số thuần, vd "15000"; "" = rỗng (cho field nullable)
  onChange: (digits: string) => void
  placeholder?: string
  className?: string
}

function formatThousands(digits: string): string {
  if (!digits) return ''
  return Number(digits).toLocaleString('vi-VN') // 15000 → "15.000"
}

export default function MoneyInput({ value, onChange, placeholder, className = '' }: Props) {
  return (
    <label className={`input input-bordered input-sm flex items-center gap-1 ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        className="grow w-full"
        placeholder={placeholder}
        value={formatThousands(value)}
        // Gõ kiểu gì cũng chỉ giữ lại chữ số → parent nhận "15000"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
      <span className="opacity-60 shrink-0 text-sm">đ</span>
    </label>
  )
}
