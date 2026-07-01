import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

// Trang hiện khi URL không khớp route nào (route catch-all "*").
// Trước đây gõ URL lạ → React Router không khớp gì → màn hình trắng/đen.
export default function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang')
  return (
    <div className="max-w-3xl mx-auto p-4">
      <EmptyState
        icon={<Compass size={48} />}
        title="404 — Không tìm thấy trang"
        description="Trang bạn tìm không tồn tại hoặc đã được di chuyển."
        action={
          <Link to="/" className="btn btn-primary">
            Về trang chủ
          </Link>
        }
      />
    </div>
  )
}
