import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getApiErrorMessage } from '../../api/client'
import {
  deleteReviewApi,
  fetchReviews,
  fetchReviewStatus,
  upsertReviewApi,
  type MyReview,
} from '../../api/reviews'
import { useAuth } from '../../hooks/useAuth'
import Pagination from './Pagination'
import Stars from './Stars'

// Ô chọn sao (1..5) cho form viết đánh giá
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={n <= value ? 'text-warning' : 'text-base-content/30'}
          aria-label={`${n} sao`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// Form viết/sửa review. initial != null nghĩa là đang SỬA review cũ.
// key={review.id ?? 'new'} ở parent để remount khi đổi review → useState khởi tạo đúng 1 lần.
function ReviewForm({ bookId, initial }: { bookId: number; initial: MyReview | null }) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [error, setError] = useState('')

  // Rating đổi → cập nhật cả danh sách review, trạng thái, và rating denormalized ở book/list
  const invalidate = () => {
    for (const key of [['reviews', bookId], ['review-status', bookId], ['book'], ['books'], ['related']]) {
      queryClient.invalidateQueries({ queryKey: key })
    }
  }

  const saveMutation = useMutation({
    // Gửi comment LUÔN (kể cả chuỗi rỗng) — để khi sửa review bỏ trắng bình luận thì BE
    // nhận '' rồi set null; nếu gửi undefined thì Prisma giữ nguyên chữ cũ (Major #1)
    mutationFn: () => upsertReviewApi(bookId, { rating, comment: comment.trim() }),
    onSuccess: invalidate,
    onError: (e) => setError(getApiErrorMessage(e)),
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteReviewApi(bookId),
    onSuccess: () => {
      setRating(0)
      setComment('')
      invalidate()
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  })

  return (
    <div className="card bg-base-200">
      <div className="card-body gap-2 p-4">
        <h3 className="font-semibold">{initial ? 'Sửa đánh giá của bạn' : 'Viết đánh giá'}</h3>
        {error && <div className="alert alert-error text-sm">{error}</div>}
        <StarInput value={rating} onChange={setRating} />
        <textarea
          className="textarea textarea-bordered"
          rows={3}
          placeholder="Cảm nhận của bạn (không bắt buộc)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm"
            disabled={rating < 1 || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {initial ? 'Lưu' : 'Gửi đánh giá'}
          </button>
          {initial && (
            <button
              className="btn btn-ghost btn-sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Xóa đánh giá của bạn?')) deleteMutation.mutate()
              }}
            >
              Xóa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Khối đánh giá dưới trang chi tiết: form (nếu đủ điều kiện) + danh sách review.
export default function ReviewsSection({ bookId }: { bookId: number }) {
  const { isLoggedIn } = useAuth()
  const [page, setPage] = useState(1)
  const { data: reviews, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['reviews', bookId, page],
    queryFn: () => fetchReviews(bookId, page),
  })
  const { data: status } = useQuery({
    queryKey: ['review-status', bookId],
    queryFn: () => fetchReviewStatus(bookId),
    enabled: isLoggedIn,
  })

  return (
    <div className="space-y-4">
      {/* Tiêu đề "Đánh giá (N)" đã nằm ở nhãn tab bên trang chi tiết → không lặp lại ở đây */}
      {!isLoggedIn && (
        <p className="text-sm text-base-content/70">Đăng nhập để đánh giá sách bạn đã mua.</p>
      )}
      {isLoggedIn &&
        status &&
        (status.can_review ? (
          <ReviewForm key={status.my_review?.id ?? 'new'} bookId={bookId} initial={status.my_review} />
        ) : (
          <p className="text-sm text-base-content/70">
            Chỉ khách đã mua &amp; nhận sách này mới được đánh giá.
          </p>
        ))}

      {isPending && <span className="loading loading-spinner" />}
      {/* Lỗi tải danh sách đánh giá: dòng gọn + link thử lại (không dùng block lỗi to vì nằm trong tab) */}
      {isError && (
        <p className="text-sm text-base-content/70">
          Không tải được đánh giá.{' '}
          <button onClick={() => refetch()} disabled={isFetching} className="link link-primary">
            Thử lại
          </button>
        </p>
      )}
      {reviews && reviews.items.length === 0 && (
        <p className="text-base-content/70">Chưa có đánh giá nào.</p>
      )}
      <ul className="space-y-4">
        {reviews?.items.map((r) => (
          <li key={r.id} className="flex gap-3 border-b border-base-300 pb-4">
            <span className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0">
              {r.user_name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{r.user_name}</span>
                <span className="text-xs text-base-content/70">
                  {new Date(r.updated_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <Stars value={r.rating} />
              {r.comment && (
                <p className="text-sm mt-1 whitespace-pre-line text-base-content/80">{r.comment}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {reviews && (
        <Pagination page={page} totalPages={reviews.totalPages} onChange={setPage} />
      )}
    </div>
  )
}
