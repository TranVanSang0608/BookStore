import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import type { AuthorInput } from './author.schemas';
import { bookCardSelect } from './book.service';

export function listAuthors() {
  // Chỉ id + name: đủ cho dropdown chọn tác giả ở form admin (Lát 6)
  return prisma.author.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export async function getAuthorWithBooks(id: number) {
  const author = await prisma.author.findUnique({
    where: { id },
    include: {
      // Trang /author/:id chỉ hiện sách đang bán — sách bị ẩn không lộ ra
      books: {
        where: { is_active: true },
        select: bookCardSelect,
        orderBy: { created_at: 'desc' },
      },
    },
  });
  if (!author) throw new AppError(404, 'Không tìm thấy tác giả');
  return author;
}

// ---------- Phần admin ----------

async function getAuthorOr404(id: number) {
  const author = await prisma.author.findUnique({ where: { id } });
  if (!author) throw new AppError(404, 'Không tìm thấy tác giả');
  return author;
}

export function createAuthor(input: AuthorInput) {
  return prisma.author.create({ data: input });
}

export async function updateAuthor(id: number, input: AuthorInput) {
  await getAuthorOr404(id);
  return prisma.author.update({ where: { id }, data: input });
}

export async function deleteAuthor(id: number) {
  await getAuthorOr404(id);

  // FK Book.author_id không có cascade — xóa author còn sách sẽ bị Postgres chặn (lỗi P2003).
  // Kiểm tra trước để trả 400 với thông báo dễ hiểu thay vì lỗi 500 khó hiểu.
  const bookCount = await prisma.book.count({ where: { author_id: id } });
  if (bookCount > 0) {
    throw new AppError(400, `Không thể xóa: tác giả đang có ${bookCount} sách. Hãy chuyển sách sang tác giả khác trước.`);
  }

  await prisma.author.delete({ where: { id } });
}
