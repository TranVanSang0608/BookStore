import type { ReactNode } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

// Khung chung cho các trang nội dung tĩnh (Điều khoản, Bảo mật): tiêu đề + ngày cập nhật + nội dung.
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  useDocumentTitle(title)
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-semibold text-base-content">{title}</h1>
      <p className="text-sm text-base-content/70 mt-1 mb-8">Cập nhật: {updated}</p>
      <div className="space-y-6 text-base-content/80 leading-relaxed">{children}</div>
    </div>
  )
}

// Một mục có tiêu đề nhỏ — dùng lại trong cả 2 trang.
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-xl font-semibold text-base-content mb-2">{heading}</h2>
      {children}
    </section>
  )
}
