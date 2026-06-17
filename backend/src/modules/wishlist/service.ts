import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { bookCardSelect } from '../catalog/book.service';

// P2002 = vi phạm unique. Ở đây chắc chắn là (user_id, book_id) — 2 request thêm cùng lúc.
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
}

// Toggle thích/bỏ thích 1 sách — IDEMPOTENT theo nghĩa "bấm 2 lần về trạng thái ban đầu":
// đã thích → bỏ; chưa thích → thêm. Trả trạng thái MỚI để FE cập nhật nút tim.
export async function toggleWishlist(userId: number, bookId: number) {
  const book = await prisma.book.findFirst({ where: { id: bookId, is_active: true } });
  if (!book) throw new AppError(404, 'Không tìm thấy sách');

  // Thử BỎ THÍCH trước bằng deleteMany (không ném lỗi nếu chưa có dòng — khác delete).
  // Dòng wishlist định danh bằng (user_id, book_id) nhờ @@unique.
  const removed = await prisma.wishlist.deleteMany({ where: { user_id: userId, book_id: bookId } });
  if (removed.count > 0) return { wishlisted: false };

  // Chưa có → THÊM. Bắt P2002 phòng 2 request song song (2 tab) cùng thêm: thay vì 500,
  // coi như đã thích (kết quả cuối vẫn đúng — không 2 dòng nhờ @@unique).
  try {
    await prisma.wishlist.create({ data: { user_id: userId, book_id: bookId } });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
  return { wishlisted: true };
}

// Danh sách sách đã thích (mới nhất trước) — chỉ sách còn bán; trả book card + rating
// để FE render lưới giống trang /books.
export async function listWishlist(userId: number) {
  const rows = await prisma.wishlist.findMany({
    where: { user_id: userId, book: { is_active: true } },
    orderBy: { created_at: 'desc' },
    include: { book: { select: bookCardSelect } }, // bookCardSelect đã gồm rating
  });
  return rows.map((r) => r.book);
}

// Tập book_id user đã thích — FE dùng để tô tim đầy/rỗng trên thẻ sách ở trang /books
export async function getWishlistedBookIds(userId: number): Promise<number[]> {
  const rows = await prisma.wishlist.findMany({
    where: { user_id: userId },
    select: { book_id: true },
  });
  return rows.map((r) => r.book_id);
}
