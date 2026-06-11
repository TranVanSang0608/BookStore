import { z } from 'zod';

export const createAddressSchema = z.object({
  recipient_name: z.string().min(1, 'Tên người nhận không được để trống').max(100),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0'),
  // FE chỉ gửi CODE — tên tỉnh/xã do server tự tra trong DB (không tin dữ liệu client)
  province_code: z.string().min(1, 'Vui lòng chọn tỉnh/thành phố'),
  ward_code: z.string().min(1, 'Vui lòng chọn phường/xã'),
  street_detail: z.string().min(1, 'Vui lòng nhập số nhà, tên đường').max(255),
  is_default: z.boolean().optional(),
});

// Update không nhận is_default — đặt mặc định có endpoint riêng (PUT /:id/default)
export const updateAddressSchema = createAddressSchema.omit({ is_default: true });

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
