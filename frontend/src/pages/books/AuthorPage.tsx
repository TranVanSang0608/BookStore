import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { fetchAuthor } from '../../api/authors'
import BookCard from '../../features/catalog/BookCard'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export default function AuthorPage() {
  const { id } = useParams()

  const { data: author, isPending, isError } = useQuery({
    queryKey: ['author', id],
    queryFn: () => fetchAuthor(Number(id)),
  })
  useDocumentTitle(author?.name)

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (isError || !author) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="alert alert-error">Không tìm thấy tác giả</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body flex-row items-center gap-6">
          {author.photo_url ? (
            <img
              src={author.photo_url}
              alt={author.name}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-base-200 flex items-center justify-center text-3xl">
              ✍️
            </div>
          )}
          <div>
            <h1 className="font-serif text-3xl font-semibold text-base-content">{author.name}</h1>
            {author.bio && <p className="text-base-content/70 mt-1">{author.bio}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold text-base-content">Sách của {author.name}</h2>
        {author.books.length === 0 ? (
          <p className="text-base-content/60">Chưa có sách nào đang bán</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {author.books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
