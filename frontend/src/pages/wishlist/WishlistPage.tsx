import { useQuery } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchWishlist } from '../../api/wishlist'
import EmptyState from '../../components/EmptyState'
import BookCard from '../../features/catalog/BookCard'

// Trang sách đã thích — nằm trong RequireAuth (dữ liệu riêng của user)
export default function WishlistPage() {
  const { data: books, isPending } = useQuery({ queryKey: ['wishlist'], queryFn: fetchWishlist })

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="font-serif text-3xl font-semibold text-base-content">Sách yêu thích</h1>

      {!books || books.length === 0 ? (
        <EmptyState
          icon={<Heart size={44} />}
          title="Bạn chưa thích cuốn sách nào"
          description="Bấm trái tim trên thẻ sách để lưu vào đây."
          action={
            <Link to="/books" className="btn btn-primary">
              Khám phá sách
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
