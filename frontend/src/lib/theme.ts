import { useState } from 'react'

// Quản lý giao diện sáng/tối: lưu lựa chọn vào localStorage + đổi data-theme trên thẻ <html>.
// (DaisyUI đọc data-theme để chọn bộ màu bookworm / bookwormdark trong index.css)

const STORAGE_KEY = 'anhsach-theme'
export const LIGHT = 'bookworm'
export const DARK = 'bookwormdark'

function resolveInitial(): string {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === LIGHT || saved === DARK) return saved
  // Chưa từng chọn → theo cài đặt sáng/tối của máy
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? DARK : LIGHT
}

// Gọi 1 lần lúc app khởi động (main.tsx) để áp theme đã lưu trước khi React render
export function initTheme(): void {
  document.documentElement.dataset.theme = resolveInitial()
}

// Hook cho nút chuyển: trả về theme hiện tại + hàm đảo sáng/tối (ghi nhớ vào localStorage)
export function useTheme() {
  const [theme, setTheme] = useState<string>(() => document.documentElement.dataset.theme || LIGHT)
  function toggle() {
    const next = theme === DARK ? LIGHT : DARK
    document.documentElement.dataset.theme = next
    localStorage.setItem(STORAGE_KEY, next)
    setTheme(next)
  }
  return { theme, isDark: theme === DARK, toggle }
}
