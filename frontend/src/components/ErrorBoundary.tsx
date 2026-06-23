import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

// Lưới an toàn cuối cùng: nếu một component NÉM LỖI khi render (bug ngoài dự kiến), React sẽ
// hiển thị fallback này thay vì để TRẮNG cả trang. Bắt buộc là class component vì React chưa có
// hook tương đương componentDidCatch/getDerivedStateFromError.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // Log để dev thấy nguyên nhân (production có thể đẩy lên dịch vụ log sau — ngoài scope)
    console.error('ErrorBoundary bắt được lỗi render:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-base-200">
          <p className="font-serif text-2xl text-base-content">Đã có lỗi xảy ra</p>
          <p className="text-sm text-base-content/70 mt-2 max-w-sm">
            Xin lỗi vì sự bất tiện. Bạn thử tải lại trang nhé.
          </p>
          <button onClick={() => window.location.reload()} className="btn btn-primary mt-4">
            Tải lại trang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
