import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode // nút hành động tuỳ chọn (vd "Khám phá sách")
}

// Trạng thái rỗng dùng chung: giỏ trống, không tìm thấy sách, chưa có yêu thích...
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      {icon && <div className="text-base-content/30 mb-3">{icon}</div>}
      <p className="font-serif text-xl text-base-content/80">{title}</p>
      {description && <p className="text-sm text-base-content/55 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
