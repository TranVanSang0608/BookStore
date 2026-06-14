import { z } from 'zod';

// 5 mức trạng thái đơn — khai báo literal (không import enum runtime từ generated client)
// để Jest không phải nạp client thật. Khớp đúng enum OrderStatus trong schema.prisma.
const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipping', 'Delivered', 'Cancelled'] as const;

// Tạo đơn: chỉ cần chọn địa chỉ giao + ghi chú; mọi tiền nong (subtotal/ship/total)
// do SERVER tự tính lại từ giỏ + zone — KHÔNG nhận từ client (D40, chống sửa giá).
// payment_method: cod (thu khi nhận) hoặc vnpay (cổng VNPay — Phase 5).
export const createOrderSchema = z.object({
  address_id: z.number().int().positive('Vui lòng chọn địa chỉ giao hàng'),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
  payment_method: z.enum(['cod', 'vnpay']).default('cod'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Admin đổi trạng thái đơn — chỉ nhận đúng 1 trong 5 mức enum.
// Việc bước chuyển có HỢP LỆ hay không (tiến 1 bước, không nhảy/lùi) do service kiểm (D42).
export const adminUpdateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export type AdminUpdateStatusInput = z.infer<typeof adminUpdateStatusSchema>;

// Query list đơn (dùng cho cả user history lẫn admin) — phân trang + lọc trạng thái.
// .catch() để giá trị rác trên URL về mặc định thay vì 400 (giống listBooks).
export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined), // admin tìm theo mã đơn
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(10),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
