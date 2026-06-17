import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchWishlist } from '../../api/wishlist'
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
      <h1 className="text-2xl font-bold">Sách yêu thích</h1>

      {!books || books.length === 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body items-center py-16 space-y-2">
            <p className="text-base-content/60">Bạn chưa thích cuốn sách nào.</p>
            <Link to="/books" className="btn btn-primary">
              Khám phá sách
            </Link>
          </div>
        </div>
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
