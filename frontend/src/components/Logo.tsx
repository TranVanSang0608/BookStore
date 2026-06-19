type LogoProps = {
  variant?: 'full' | 'icon' // 'full' = icon + chữ; 'icon' = chỉ dấu hiệu (cỡ nhỏ)
  tone?: 'auto' | 'light' // 'auto' = đổi màu theo theme; 'light' = nét sáng cho nền tối (footer)
  size?: number // chiều cao icon (px); chữ co theo size
  className?: string
}

// Logo thương hiệu "Ánh Sách": sách mở + tia sáng + bóng đèn (ánh sáng tri thức).
// Vẽ bằng SVG nên sắc nét ở mọi cỡ; màu lấy từ biến theme DaisyUI (var(--color-*)).
export default function Logo({ variant = 'full', tone = 'auto', size = 34, className = '' }: LogoProps) {
  const book = tone === 'light' ? '#ece3cc' : 'var(--color-primary)'
  const ray = tone === 'light' ? '#d9b873' : 'var(--color-accent)'
  const bulb = '#fff1cf'
  const spine = tone === 'light' ? 'rgba(46,40,28,.35)' : 'rgba(20,16,12,.28)'
  const text = tone === 'light' ? '#f4eee2' : 'currentColor'
  const w = Math.round((size * 64) / 52)

  const icon = (
    <svg width={w} height={size} viewBox="0 0 64 52" fill="none" aria-hidden="true">
      {/* tia sáng (vàng đồng) toả lên từ trang sách */}
      <g stroke={ray} strokeWidth="2.4" strokeLinecap="round">
        <line x1="32" y1="22" x2="32" y2="5" />
        <line x1="32" y1="22" x2="21" y2="9" />
        <line x1="32" y1="22" x2="43" y2="9" />
        <line x1="32" y1="22" x2="13" y2="15" />
        <line x1="32" y1="22" x2="51" y2="15" />
      </g>
      {/* sách mở (xanh rêu) */}
      <path d="M32 46 L8 38 L8 22 L32 30 Z" fill={book} />
      <path d="M32 30 L56 22 L56 38 L32 46 Z" fill={book} fillOpacity="0.82" />
      <line x1="32" y1="30" x2="32" y2="46" stroke={spine} strokeWidth="1.4" />
      {/* bóng đèn (ánh sáng) ở giữa */}
      <circle cx="32" cy="23" r="4.2" fill={bulb} stroke={ray} strokeWidth="1.3" />
    </svg>
  )

  if (variant === 'icon') {
    return (
      <span className={`inline-flex ${className}`} aria-label="Ánh Sách">
        {icon}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Ánh Sách">
      {icon}
      <span
        className="font-serif font-semibold leading-none tracking-tight"
        style={{ color: text, fontSize: Math.round(size * 0.82) }}
      >
        Ánh Sách
      </span>
    </span>
  )
}
