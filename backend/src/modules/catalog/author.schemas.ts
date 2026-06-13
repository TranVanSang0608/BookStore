import { z } from 'zod';

export const authorSchema = z.object({
  name: z.string().trim().min(1, 'Tên tác giả không được để trống').max(100),
  bio: z.string().max(5000).optional(),
  photo_url: z.url('URL ảnh không hợp lệ').optional(),
});

export type AuthorInput = z.infer<typeof authorSchema>;
