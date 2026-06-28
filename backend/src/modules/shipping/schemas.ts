import { z } from 'zod';

// Body cập nhật phí ship của 1 tỉnh (admin). FE đã ép kiểu number trước khi gửi.
// free_threshold = null nghĩa là tỉnh đó KHÔNG áp dụng miễn phí ship.
export const updateShippingZoneSchema = z.object({
  fee: z.number().int().nonnegative('Phí ship phải lớn hơn hoặc bằng 0'),
  free_threshold: z.number().int().positive('Ngưỡng miễn phí phải lớn hơn 0').nullable(),
});

// Cấu hình kho + công thức phí theo khoảng cách (D62). FE ép kiểu number trước khi gửi.
export const updateShippingConfigSchema = z.object({
  warehouse_lat: z.number().min(-90).max(90),
  warehouse_lng: z.number().min(-180).max(180),
  base_fee: z.number().int().nonnegative('Phí nền phải >= 0'),
  per_km_fee: z.number().int().nonnegative('Phí/km phải >= 0'),
  free_km: z.number().int().nonnegative('Số km miễn phí phải >= 0'),
  free_threshold: z.number().int().positive('Ngưỡng miễn phí phải > 0').nullable(),
  max_fee: z.number().int().positive('Trần phí phải > 0').nullable(),
  road_factor: z.number().min(1, 'Hệ số đường bộ phải >= 1').max(3, 'Hệ số đường bộ tối đa 3'),
  enabled: z.boolean(),
});
