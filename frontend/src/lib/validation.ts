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

// Đặt lại mật khẩu (trang /reset-password) — mật khẩu mới + nhập lại
export const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirm_password'],
  })

export const profileFormSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(100, 'Tên tối đa 100 ký tự'),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0')
    .or(z.literal('')),
})

export const changePasswordFormSchema = z
  .object({
    current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    new_password: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
    confirm_new_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_new_password, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirm_new_password'],
  })
  .refine((d) => d.current_password !== d.new_password, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['new_password'],
  })

export const addressFormSchema = z.object({
  recipient_name: z.string().min(1, 'Tên người nhận không được để trống').max(100),
  phone: z.string().regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0'),
  province_code: z.string().min(1, 'Vui lòng chọn tỉnh/thành phố'),
  ward_code: z.string().min(1, 'Vui lòng chọn phường/xã'),
  street_detail: z.string().min(1, 'Vui lòng nhập số nhà, tên đường').max(255),
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

// Đưa con trỏ tới ô ĐẦU TIÊN (theo thứ tự hiển thị) đang có lỗi → người dùng nhảy thẳng tới
// chỗ cần sửa thay vì tự dò. Gọi ngay sau setFieldErrors (input đã render nên getElementById thấy).
// toId: dịch tên field (key của errors) sang id của input khi 2 cái không trùng (vd profile_name).
export function focusFirstError(
  fieldOrder: string[],
  errors: Record<string, string>,
  toId: (field: string) => string = (f) => f,
): void {
  const first = fieldOrder.find((f) => errors[f])
  if (first) document.getElementById(toId(first))?.focus()
}
