import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchWishlistIds, toggleWishlistApi } from '../../api/wishlist'
import { useAuth } from '../../hooks/useAuth'

// Nút tim tự chứa: tự biết trạng thái (từ query ['wishlist-ids']) + tự toggle.
// Dùng được trên thẻ sách (trong <Link>) lẫn trang chi tiết.
export default function WishlistButton({ bookId, className = '' }: { bookId: number; className?: string }) {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Chỉ gọi khi đã đăng nhập; guest thì danh sách rỗng → tim rỗng
  const { data: ids } = useQuery({
    queryKey: ['wishlist-ids'],
    queryFn: fetchWishlistIds,
    enabled: isLoggedIn,
  })
  const wishlisted = ids?.includes(bookId) ?? false

  const mutation = useMutation({
    mutationFn: () => toggleWishlistApi(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist-ids'] })
      queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })

  function handleClick(e: React.MouseEvent) {
    // Thẻ sách bọc trong <Link> — chặn điều hướng + nổi bọt khi bấm tim
    e.preventDefault()
    e.stopPropagation()
    if (!isLoggedIn) {
      navigate('/login') // guest → mời đăng nhập
      return
    }
    mutation.mutate()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      className={`btn btn-circle btn-sm bg-base-100/80 hover:bg-base-100 border-none text-lg ${className}`}
      aria-label={wishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
      title={wishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
    >
      <span className={wishlisted ? 'text-error' : 'text-base-content/40'}>
        {wishlisted ? '♥' : '♡'}
      </span>
    </button>
  )
}
