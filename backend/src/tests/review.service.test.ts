// Unit test cho review service — mock prisma. Trọng tâm: verified purchase + recompute rating.
import { prisma } from '../lib/prisma';
import {
  deleteReview,
  getReviewStatus,
  hasPurchased,
  listReviews,
  upsertReview,
} from '../modules/review/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    book: { findFirst: jest.fn(), update: jest.fn() },
    order: { count: jest.fn() },
    review: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    // $transaction callback nhận chính prisma mock đóng vai tx
    $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
  },
}));

const bookFindFirst = prisma.book.findFirst as jest.Mock;
const bookUpdate = prisma.book.update as jest.Mock;
const orderCount = prisma.order.count as jest.Mock;
const reviewUpsert = prisma.review.upsert as jest.Mock;
const reviewDeleteMany = prisma.review.deleteMany as jest.Mock;
const reviewAggregate = prisma.review.aggregate as jest.Mock;
const reviewFindMany = prisma.review.findMany as jest.Mock;
const reviewFindUnique = prisma.review.findUnique as jest.Mock;
const reviewCount = prisma.review.count as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  reviewAggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: 2 });
  bookUpdate.mockResolvedValue({});
});

describe('upsertReview', () => {
  it('sách không tồn tại → 404', async () => {
    bookFindFirst.mockResolvedValue(null);
    await expect(upsertReview(1, 10, 5)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('chưa mua (không có đơn Delivered) → 403', async () => {
    bookFindFirst.mockResolvedValue({ id: 10 });
    orderCount.mockResolvedValue(0);
    await expect(upsertReview(1, 10, 5)).rejects.toMatchObject({ statusCode: 403 });
    expect(reviewUpsert).not.toHaveBeenCalled();
  });

  it('đã mua → upsert review + tính lại rating denormalized lên Book', async () => {
    bookFindFirst.mockResolvedValue({ id: 10 });
    orderCount.mockResolvedValue(1);
    reviewUpsert.mockResolvedValue({ id: 7, rating: 5 });

    await upsertReview(1, 10, 5, 'hay');
    expect(reviewUpsert.mock.calls[0][0]).toMatchObject({
      where: { user_id_book_id: { user_id: 1, book_id: 10 } },
      create: { user_id: 1, book_id: 10, rating: 5, comment: 'hay' },
      update: { rating: 5, comment: 'hay' },
    });
    expect(bookUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { avg_rating: 4.5, review_count: 2 },
    });
  });

  it('sửa review bỏ trắng bình luận → lưu comment = null (không giữ chữ cũ — Major #1)', async () => {
    bookFindFirst.mockResolvedValue({ id: 10 });
    orderCount.mockResolvedValue(1);
    reviewUpsert.mockResolvedValue({ id: 7 });

    await upsertReview(1, 10, 4, '   '); // toàn khoảng trắng = ý định xóa bình luận
    const arg = reviewUpsert.mock.calls[0][0];
    expect(arg.create.comment).toBeNull();
    expect(arg.update.comment).toBeNull();
  });
});

describe('getReviewStatus', () => {
  it('đã mua + có review → can_review true + my_review', async () => {
    orderCount.mockResolvedValue(1);
    reviewFindUnique.mockResolvedValue({ id: 7, rating: 5, comment: 'hay', updated_at: 'u' });

    const res = await getReviewStatus(1, 10);
    expect(res.can_review).toBe(true);
    expect(res.my_review).toMatchObject({ id: 7, rating: 5 });
  });

  it('chưa mua + chưa review → can_review false + my_review null', async () => {
    orderCount.mockResolvedValue(0);
    reviewFindUnique.mockResolvedValue(null);

    const res = await getReviewStatus(1, 10);
    expect(res).toEqual({ can_review: false, my_review: null });
  });
});

describe('deleteReview', () => {
  it('chưa từng review (count=0) → 404', async () => {
    reviewDeleteMany.mockResolvedValue({ count: 0 });
    await expect(deleteReview(1, 10)).rejects.toMatchObject({ statusCode: 404 });
    expect(bookUpdate).not.toHaveBeenCalled();
  });

  it('có review → xóa + tính lại rating (hết review → avg 0)', async () => {
    reviewDeleteMany.mockResolvedValue({ count: 1 });
    reviewAggregate.mockResolvedValue({ _avg: { rating: null }, _count: 0 });
    await deleteReview(1, 10);
    expect(bookUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { avg_rating: 0, review_count: 0 },
    });
  });
});

describe('hasPurchased', () => {
  it('có đơn Delivered chứa sách → true', async () => {
    orderCount.mockResolvedValue(1);
    expect(await hasPurchased(1, 10)).toBe(true);
    expect(orderCount.mock.calls[0][0].where).toMatchObject({
      user_id: 1,
      status: 'Delivered',
      items: { some: { book_id: 10 } },
    });
  });
});

describe('listReviews', () => {
  it('trả shape gọn + user_name', async () => {
    reviewFindMany.mockResolvedValue([
      { id: 1, rating: 5, comment: 'x', created_at: 'c', updated_at: 'u', user: { name: 'A' } },
    ]);
    reviewCount.mockResolvedValue(1);

    const res = await listReviews(10, 1, 10);
    expect(res.items[0]).toEqual({
      id: 1,
      rating: 5,
      comment: 'x',
      user_name: 'A',
      created_at: 'c',
      updated_at: 'u',
    });
    expect(res.totalPages).toBe(1);
  });
});
