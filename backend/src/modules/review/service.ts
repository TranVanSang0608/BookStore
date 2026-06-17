import type { Prisma } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';

// Tính lại điểm trung bình + số lượt của 1 sách rồi ghi denormalized lên Book.
// Gọi TRONG transaction cùng thao tác review để cột trên Book không bao giờ lệch bảng Review (D58).
async function recomputeBookRating(tx: Prisma.TransactionClient, bookId: number) {
  const agg = await tx.review.aggregate({
    where: { book_id: bookId },
    _avg: { rating: true },
    _count: true,
  });
  await tx.book.update({
    where: { id: bookId },
    data: { avg_rating: agg._avg.rating ?? 0, review_count: agg._count },
  });
}

// User đã MUA + NHẬN sách này chưa? (có đơn Delivered chứa book_id) — verified purchase (D5).
export async function hasPurchased(userId: number, bookId: number): Promise<boolean> {
  const count = await prisma.order.count({
    where: { user_id: userId, status: 'Delivered', items: { some: { book_id: bookId } } },
  });
  return count > 0;
}

// Tạo MỚI hoặc SỬA review của chính mình (mỗi user 1 review/sách nhờ @@unique).
// Chặn nếu chưa mua. Ghi review + tính lại rating trong CÙNG transaction.
export async function upsertReview(userId: number, bookId: number, rating: number, comment?: string) {
  const book = await prisma.book.findFirst({ where: { id: bookId, is_active: true } });
  if (!book) throw new AppError(404, 'Không tìm thấy sách');

  if (!(await hasPurchased(userId, bookId))) {
    throw new AppError(403, 'Bạn cần mua và nhận sách này mới được đánh giá');
  }

  // Chuẩn hóa bình luận thành string | NULL tường minh: Prisma coi `undefined` là "đừng đụng
  // cột" → khi user SỬA review và xóa trắng ô bình luận, phải truyền null mới xóa được chữ cũ.
  const text = comment?.trim() ? comment.trim() : null;

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.upsert({
      where: { user_id_book_id: { user_id: userId, book_id: bookId } },
      create: { user_id: userId, book_id: bookId, rating, comment: text },
      update: { rating, comment: text },
    });
    await recomputeBookRating(tx, bookId);
    return review;
  });
}

// Xóa review CỦA MÌNH cho 1 sách + tính lại rating.
export async function deleteReview(userId: number, bookId: number) {
  return prisma.$transaction(async (tx) => {
    // deleteMany theo (user_id, book_id): chỉ xóa đúng review của mình; count=0 = chưa từng review
    const deleted = await tx.review.deleteMany({ where: { user_id: userId, book_id: bookId } });
    if (deleted.count === 0) throw new AppError(404, 'Bạn chưa đánh giá sách này');
    await recomputeBookRating(tx, bookId);
    return { deleted: true };
  });
}

// Danh sách review của 1 sách (mới sửa lên đầu) — public, phân trang.
export async function listReviews(bookId: number, page: number, limit: number) {
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: { book_id: bookId },
      orderBy: { updated_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true } } },
    }),
    prisma.review.count({ where: { book_id: bookId } }),
  ]);

  return {
    items: items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      user_name: r.user.name,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// Review của 1 user cho 1 sách (để FE đổ vào form sửa). null = chưa đánh giá.
export async function getMyReview(userId: number, bookId: number) {
  return prisma.review.findUnique({
    where: { user_id_book_id: { user_id: userId, book_id: bookId } },
    select: { id: true, rating: true, comment: true, updated_at: true },
  });
}

// Trạng thái đánh giá của user cho 1 sách — FE trang chi tiết dùng để quyết định hiện
// form viết/sửa hay không: can_review (đã mua chưa) + my_review (review hiện có, nếu có).
export async function getReviewStatus(userId: number, bookId: number) {
  const [can_review, my_review] = await Promise.all([
    hasPurchased(userId, bookId),
    getMyReview(userId, bookId),
  ]);
  return { can_review, my_review };
}
