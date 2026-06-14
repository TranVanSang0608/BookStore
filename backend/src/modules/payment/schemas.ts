import { z } from 'zod';

// Khởi tạo / thử lại thanh toán VNPay cho 1 đơn — chỉ cần mã đơn,
// mọi thứ còn lại (số tiền) server tự tra từ DB.
export const createVnpaySchema = z.object({
  order_code: z.string().min(1, 'Thiếu mã đơn hàng'),
});

export type CreateVnpayInput = z.infer<typeof createVnpaySchema>;
