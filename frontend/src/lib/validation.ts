import { z } from 'zod'

// Zod schema cho form — CÙNG quy tắc với backend (password ≥ 8, phone 10 số...).
// Validate ở FE chỉ để UX tốt (báo lỗi ngay không cần chờ server);
// backend vẫn validate lại — client không bao giờ được tin tuyệt đối.

export const loginFormSchema = z.object({
  email: z.email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})

export const registerFormSchema = z
  .object({
    name: z.string().min(1, 'Tên không được để trống').max(100, 'Tên tối đa 100 ký tự'),
    email: z.email('Email không hợp lệ'),
    // Cho phép bỏ trống; nếu nhập thì phải đúng định dạng
    phone: z
      .string()
      .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0')
      .or(z.literal('')),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirm_password'],
  })

// Gom lỗi Zod thành { tên_field: message } cho form hiển thị dưới từng ô input
export function zodErrorsToMap(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '')
    if (!map[field]) map[field] = issue.message // giữ lỗi đầu tiên của mỗi field
  }
  return map
}
