import { z } from 'zod';

// Mọi field optional (admin có thể chỉ sửa 1 ô). Có giá trị thì không được rỗng + giới hạn
// độ dài cho gọn. Service sẽ bỏ qua key lạ nên ở đây chỉ khai đúng 3 thiết lập đang dùng.
export const updateSettingsSchema = z.object({
  shop_hotline: z.string().trim().min(1, 'Hotline không được để trống').max(50).optional(),
  shop_email: z.string().trim().min(1, 'Email không được để trống').max(120).optional(),
  shop_address: z.string().trim().min(1, 'Địa chỉ không được để trống').max(200).optional(),
});
