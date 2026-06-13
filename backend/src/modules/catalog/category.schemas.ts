import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Tên thể loại không được để trống').max(100),
  description: z.string().max(1000).optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
