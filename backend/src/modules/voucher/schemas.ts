import { z } from 'zod';

// Preview voucher (checkout): chỉ cần mã; subtotal server tự lấy từ giỏ DB.
export const previewVoucherSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã giảm giá').max(50, 'Mã quá dài'),
});

export type PreviewVoucherInput = z.infer<typeof previewVoucherSchema>;

// ---------- Admin: tạo / sửa voucher ----------

// % thì discount_value phải 1–100 (số tiền cố định thì chỉ cần > 0)
const percentInRange = (type: string | undefined, value: number | undefined) =>
  type !== 'percentage' || value === undefined || (value >= 1 && value <= 100);

export const createVoucherSchema = z
  .object({
    code: z.string().trim().min(1, 'Mã không được để trống').max(50),
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.number().int().positive('Giá trị giảm phải lớn hơn 0'),
    min_order: z.number().int().min(0).default(0),
    max_discount: z.number().int().positive().nullish(), // trần giảm cho %; null/bỏ trống = không trần
    expire_at: z.coerce.date().nullish(), // nhận ISO string → Date; null = không hết hạn
    usage_limit: z.number().int().positive().nullish(),
    per_user_limit: z.number().int().positive().default(1),
    is_active: z.boolean().default(true),
  })
  .refine((d) => percentInRange(d.discount_type, d.discount_value), {
    message: 'Giảm theo % phải trong khoảng 1–100',
    path: ['discount_value'],
  });

// Update: mọi field optional (sửa phần nào gửi phần đó), không có default để khỏi đặt nhầm.
export const updateVoucherSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    discount_type: z.enum(['percentage', 'fixed']).optional(),
    discount_value: z.number().int().positive().optional(),
    min_order: z.number().int().min(0).optional(),
    max_discount: z.number().int().positive().nullish(),
    expire_at: z.coerce.date().nullish(),
    usage_limit: z.number().int().positive().nullish(),
    per_user_limit: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => percentInRange(d.discount_type, d.discount_value), {
    message: 'Giảm theo % phải trong khoảng 1–100',
    path: ['discount_value'],
  });

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
