import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(100, 'Tên tối đa 100 ký tự'),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0')
    .optional(),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    new_password: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
  })
  // refine: rule so sánh GIỮA các field — Zod chạy sau khi từng field đã hợp lệ
  .refine((data) => data.current_password !== data.new_password, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['new_password'], // báo lỗi vào field new_password trên form FE
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
