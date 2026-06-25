import { z } from 'zod';

// Body cập nhật phí ship của 1 tỉnh (admin). FE đã ép kiểu number trước khi gửi.
// free_threshold = null nghĩa là tỉnh đó KHÔNG áp dụng miễn phí ship.
export const updateShippingZoneSchema = z.object({
  fee: z.number().int().nonnegative('Phí ship phải lớn hơn hoặc bằng 0'),
  free_threshold: z.number().int().positive('Ngưỡng miễn phí phải lớn hơn 0').nullable(),
});
