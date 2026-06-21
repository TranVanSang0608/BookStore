import { useEffect } from 'react'

const BRAND = 'Ánh Sách'

// Đổi tiêu đề tab trình duyệt theo trang (tốt cho UX + SEO — tab hiện "Nhà Giả Kim — Ánh Sách").
// title rỗng/undefined → chỉ hiện tên thương hiệu. Phụ thuộc [title] nên dữ liệu load xong
// (vd tên sách từ API) thì tiêu đề tự cập nhật theo.
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BRAND}` : `${BRAND} — Nhà sách trực tuyến`
  }, [title])
}
