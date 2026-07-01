import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle, Send, X } from 'lucide-react'
import { sendChat, type ChatBook, type ChatMessage } from '../../api/chat'
import { getApiErrorMessage } from '../../api/client'
import ChatBookCard from './ChatBookCard'
import { GREETING, QUICK_PROMPTS } from './quickPrompts'

// Tin nhắn hiển thị: như ChatMessage nhưng tin của bot có thể kèm danh sách thẻ sách.
interface UIMessage extends ChatMessage {
  books?: ChatBook[]
}

// Bong bóng chat nổi góc phải (trang khách). Lịch sử chỉ giữ trong state (ephemeral):
// tải lại trang là cuộc trò chuyện mới — đơn giản, không cần bảng DB.
export default function ChatWidget() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: (history: ChatMessage[]) => sendChat(history),
    onSuccess: (res) =>
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, books: res.books }]),
    // Lỗi API (DeepSeek bận, mất mạng, quá rate-limit) → hiện câu thân thiện thay vì trắng trang
    onError: (err) =>
      setMessages((prev) => [...prev, { role: 'assistant', content: getApiErrorMessage(err) }]),
  })

  // Tự cuộn xuống cuối mỗi khi có tin mới / đang chờ trả lời / mới mở khung
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, mutation.isPending, open])

  // Ẩn ở khu admin (Layout chỉ bọc trang khách, nhưng chặn thêm cho chắc)
  if (location.pathname.startsWith('/admin')) return null

  // Trang chi tiết sách (mobile) có thanh CTA cố định đáy màn hình (xem BookDetailPage) —
  // nâng bong bóng chat lên để không đè lên thanh đó. Các trang khác giữ nguyên bottom-4.
  const isBookDetailPage = /^\/books\/[^/]+$/.test(location.pathname)
  const bottomOffset = isBookDetailPage ? 'bottom-20 lg:bottom-4' : 'bottom-4'

  function send(text: string) {
    const content = text.trim()
    if (!content || mutation.isPending) return
    const next: UIMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    // Chỉ gửi ~10 tin GẦN NHẤT (bỏ field books): tránh payload phình vô hạn theo hội thoại +
    // không bao giờ chạm trần max(20) của schema (backend còn cắt tiếp về vài lượt cho model).
    mutation.mutate(next.slice(-10).map(({ role, content }) => ({ role, content })))
  }

  return (
    <>
      {/* Bong bóng nổi — ẩn khi khung đang mở */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở trợ lý tư vấn sách"
          className={`fixed ${bottomOffset} right-4 z-50 btn btn-primary btn-circle btn-lg shadow-lg`}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Khung chat */}
      {open && (
        <div
          className={`fixed ${bottomOffset} right-4 z-50 flex h-[32rem] max-h-[calc(100vh-2rem)] w-96 max-w-[calc(100vw-2rem)] flex-col rounded-box border border-base-300 bg-base-100 shadow-2xl`}
        >
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-box border-b border-base-300 bg-primary px-4 py-3 text-primary-content">
            <span className="font-serif font-semibold">Trợ lý Ánh Sách</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="btn btn-circle btn-ghost btn-sm text-primary-content"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {/* Lời chào + gợi ý bấm nhanh khi chưa có hội thoại */}
            {messages.length === 0 && (
              <div className="space-y-3">
                <Bubble role="assistant">{GREETING}</Bubble>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="btn btn-outline btn-primary btn-xs rounded-full font-normal normal-case"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <Bubble role={m.role}>{renderRich(m.content)}</Bubble>
                {m.books && m.books.length > 0 && (
                  <div className="space-y-2">
                    {m.books.map((b) => (
                      <ChatBookCard key={b.id} book={b} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Đang chờ DeepSeek trả lời */}
            {mutation.isPending && (
              <Bubble role="assistant">
                <span className="loading loading-dots loading-sm" />
              </Bubble>
            )}
          </div>

          {/* Ô nhập */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-base-300 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              maxLength={2000}
              className="input input-bordered input-sm flex-1"
            />
            <button
              type="submit"
              disabled={!input.trim() || mutation.isPending}
              aria-label="Gửi"
              className="btn btn-circle btn-primary btn-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

// Chuyển **đậm** / *nghiêng* trong câu trả lời thành <strong>/<em> một cách AN TOÀN: tự dựng
// element React từ chuỗi (KHÔNG dùng dangerouslySetInnerHTML — tránh XSS) vì model đôi khi vẫn
// trả markdown dù system prompt đã dặn không dùng.
function renderRich(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <strong key={i}>{bold[1]}</strong>
    const italic = part.match(/^\*([^*]+)\*$/)
    if (italic) return <em key={i}>{italic[1]}</em>
    return <span key={i}>{part}</span>
  })
}

// Một bong bóng tin nhắn: của khách (phải, nền primary) hoặc của bot (trái, nền xám).
function Bubble({ role, children }: { role: 'user' | 'assistant'; children: ReactNode }) {
  const isUser = role === 'user'
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ' +
          (isUser
            ? 'rounded-br-sm bg-primary text-primary-content'
            : 'rounded-bl-sm bg-base-200 text-base-content')
        }
      >
        {children}
      </div>
    </div>
  )
}
