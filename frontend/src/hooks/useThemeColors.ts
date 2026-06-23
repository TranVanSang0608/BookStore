import { useEffect, useState } from 'react'

// Các token màu DaisyUI cần cho biểu đồ. Trong index.css ta khai bằng HEX nên getPropertyValue
// trả về chuỗi hex sạch (vd "#3e5a39") — Recharts dùng trực tiếp làm fill được.
const TOKEN_VARS = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  info: '--color-info',
  success: '--color-success',
  warning: '--color-warning',
  neutral: '--color-neutral',
  baseContent: '--color-base-content',
  base300: '--color-base-300',
} as const

export type ThemeColors = Record<keyof typeof TOKEN_VARS, string>

function readColors(): ThemeColors {
  const s = getComputedStyle(document.documentElement)
  const out = {} as ThemeColors
  for (const key in TOKEN_VARS) {
    const k = key as keyof typeof TOKEN_VARS
    out[k] = s.getPropertyValue(TOKEN_VARS[k]).trim()
  }
  return out
}

// Đọc màu theme hiện tại để vẽ biểu đồ — TỰ ĐỔI theo sáng/tối nhờ MutationObserver theo dõi
// thuộc tính data-theme trên <html> (lib/theme đổi data-theme khi bấm nút chuyển giao diện).
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState(readColors)
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(readColors()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return colors
}
