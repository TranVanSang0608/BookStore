import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Tailwind 4 chạy dưới dạng Vite plugin — không cần tailwind.config.js như Tailwind 3
  plugins: [react(), tailwindcss()],
})
