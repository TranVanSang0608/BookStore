import { Request, Response } from 'express';
import { parseId } from '../../lib/parse-id';
import { listReviewsQuerySchema } from './schemas';
import * as reviewService from './service';

// Public: danh sách review của 1 sách (phân trang)
export async function list(req: Request, res: Response) {
  const query = listReviewsQuerySchema.parse(req.query);
  const result = await reviewService.listReviews(parseId(req.params.bookId), query.page, query.limit);
  res.json({ success: true, data: result });
}

// Auth: tạo mới hoặc sửa review của mình (verified purchase kiểm trong service)
export async function upsert(req: Request, res: Response) {
  const result = await reviewService.upsertReview(
    req.user!.id,
    parseId(req.params.bookId),
    req.body.rating,
    req.body.comment,
  );
  // 200 (không 201): upsert "lưu review của tôi" — có thể tạo mới HOẶC sửa bản cũ
  res.json({ success: true, data: result });
}

// Auth: xóa review của mình
export async function remove(req: Request, res: Response) {
  const result = await reviewService.deleteReview(req.user!.id, parseId(req.params.bookId));
  res.json({ success: true, data: result });
}

// Auth: trạng thái review của tôi cho 1 sách (can_review + my_review) — FE trang chi tiết
export async function status(req: Request, res: Response) {
  const result = await reviewService.getReviewStatus(req.user!.id, parseId(req.params.bookId));
  res.json({ success: true, data: result });
}
