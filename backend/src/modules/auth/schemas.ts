import { z } from 'zod';

// Quy tắc validate input — chạy qua middleware validate(schema) TRƯỚC khi vào controller.
// Message tiếng Việt vì sẽ hiển thị thẳng lên form FE.

export const registerSchema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  name: z.string().min(1, 'Tên không được để trống').max(100, 'Tên tối đa 100 ký tự'),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0')
    .optional(),
});

export const loginSchema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

// Suy ra type TypeScript từ chính schema — sửa rule là type tự cập nhật theo
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
