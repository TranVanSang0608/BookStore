import { z } from 'zod';

// Tạo/sửa review — sao 1..5 + bình luận tùy chọn
export const upsertReviewSchema = z.object({
  rating: z.number().int().min(1, 'Chọn từ 1 đến 5 sao').max(5, 'Chọn từ 1 đến 5 sao'),
  comment: z.string().trim().max(1000, 'Bình luận tối đa 1000 ký tự').optional(),
});

export type UpsertReviewInput = z.infer<typeof upsertReviewSchema>;

// Phân trang danh sách review (public) — .catch() để query rác về mặc định
export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(10),
});
