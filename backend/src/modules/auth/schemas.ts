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

// Đăng nhập Google (D60) — FE gửi ID token (credential) lấy từ Google Identity Services
export const googleLoginSchema = z.object({
  credential: z.string().min(1, 'Thiếu credential từ Google'),
});

// Token xác thực email — chuỗi gửi trong link, FE gửi lại để xác thực
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Thiếu mã xác thực'),
});

// Quên mật khẩu — chỉ cần email
export const forgotPasswordSchema = z.object({
  email: z.email('Email không hợp lệ'),
});

// Đặt lại mật khẩu — token từ link + mật khẩu mới (cùng rule độ dài như đăng ký)
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Thiếu mã đặt lại mật khẩu'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

// Suy ra type TypeScript từ chính schema — sửa rule là type tự cập nhật theo
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
