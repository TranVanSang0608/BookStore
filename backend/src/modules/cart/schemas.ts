import { z } from 'zod';

// Giới hạn 99 cuốn/sách: chống nhập số lượng vô lý, đồng bộ với MAX_QTY_PER_LINE bên service
export const addItemSchema = z.object({
  book_id: z.number().int().positive('book_id không hợp lệ'),
  quantity: z.number().int('Số lượng phải là số nguyên').min(1, 'Số lượng tối thiểu là 1').max(99, 'Tối đa 99 cuốn mỗi sách'),
});

export const updateItemSchema = addItemSchema.pick({ quantity: true });

// Payload merge từ guest cart (localStorage). Quantity KHÔNG cap 99 ở đây:
// dữ liệu localStorage có thể bị sửa tay — service sẽ tự clamp, không trả lỗi
// (merge là bước nền của login, không được phép làm fail flow đăng nhập)
export const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        book_id: z.number().int().positive(),
        quantity: z.number().int().min(1),
      }),
    )
    .max(100, 'Giỏ hàng quá lớn'),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
