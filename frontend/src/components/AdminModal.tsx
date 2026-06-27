import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Ghi đè độ rộng modal-box (vd "max-w-2xl" cho form nhiều field như voucher) */
  className?: string
}

// Hộp thoại (modal) dùng chung cho các form thêm/sửa ở khu admin — thay cho form inline cố định
// trên trang (phải cuộn lên/xuống khi list dài). Dùng thẻ <dialog> gốc của trình duyệt:
// hỗ trợ sẵn ESC để đóng + lớp nền tối, có khóa focus. Đồng bộ open/close qua ref.
export default function AdminModal({ open, onClose, title, children, className = '' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // showModal() mở dạng modal thật (có nền tối + khóa nền); close() đóng
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // onClose của <dialog> bắt MỌI cách đóng (ESC, bấm nền, .close()) → đồng bộ state về cha
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className={`modal-box ${className}`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold">{title}</h3>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
      {/* Bấm ra vùng nền tối để đóng (method="dialog" tự đóng dialog → kích hoạt onClose) */}
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Đóng">close</button>
      </form>
    </dialog>
  )
}
