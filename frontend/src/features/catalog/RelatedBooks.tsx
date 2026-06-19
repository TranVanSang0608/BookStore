import { useQuery } from '@tanstack/react-query'
import { fetchRelatedBooks } from '../../api/books'
import BookCard from './BookCard'

// Khối "Sách liên quan" dưới trang chi tiết — ẩn hẳn nếu không có sách nào
export default function RelatedBooks({ slug }: { slug: string }) {
  const { data: books } = useQuery({
    queryKey: ['related', slug],
    queryFn: () => fetchRelatedBooks(slug),
  })

  if (!books || books.length === 0) return null

  return (
    <div className="mt-10">
      <h2 className="font-serif text-2xl font-semibold text-base-content mb-5">Sách liên quan</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </div>
  )
}
