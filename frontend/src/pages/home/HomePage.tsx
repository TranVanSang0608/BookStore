import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchBooks } from '../../api/books'
import BookCard from '../../features/catalog/BookCard'

// Trang chủ: banner + dải 8 sách mới nhất (tái dùng BookCard của trang list)
export default function HomePage() {
  const { data, isPending } = useQuery({
    queryKey: ['books', { limit: '8' }],
    queryFn: () => fetchBooks({ limit: '8' }), // sort mặc định = newest
  })

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="hero bg-base-100 rounded-box shadow py-14">
        <div className="hero-content text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-4xl font-bold">Nhà sách trực tuyến</h1>
            <p className="text-base-content/70">
              Hàng nghìn đầu sách hay, giao tận nơi toàn quốc
            </p>
            <Link to="/books" className="btn btn-primary">
              Khám phá ngay
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sách mới</h2>
          <Link to="/books" className="link link-primary text-sm">
            Xem tất cả →
          </Link>
        </div>

        {isPending && (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.items.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
