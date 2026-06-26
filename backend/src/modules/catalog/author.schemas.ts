import { z } from 'zod';
import { isOwnCloudinaryUrl } from '../../lib/cloudinary';

export const authorSchema = z.object({
  name: z.string().trim().min(1, 'Tên tác giả không được để trống').max(100),
  bio: z.string().max(5000).optional(),
  // Chỉ nhận URL ảnh do hệ thống upload (Cloudinary account mình) — chặn URL ngoài
  photo_url: z
    .url('URL ảnh không hợp lệ')
    .refine(isOwnCloudinaryUrl, 'Ảnh phải được tải lên qua hệ thống')
    .optional(),
});

export type AuthorInput = z.infer<typeof authorSchema>;
