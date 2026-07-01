import { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error';
import * as shippingService from './service';

// Query string parse tại controller (middleware validate() chỉ chạy trên body).
// Khác listBooks dùng .catch() cho giá trị mặc định: ở đây province_code SAI là lỗi thật
// (không có mặc định hợp lý) → safeParse + 400
const feeQuerySchema = z.object({
  province_code: z.string().min(1, 'Thiếu mã tỉnh/thành phố'),
  subtotal: z.coerce.number().int().nonnegative('Tạm tính không hợp lệ'),
});

export async function getFee(req: Request, res: Response) {
  const result = feeQuerySchema.safeParse(req.query);
  if (!result.success) throw new AppError(400, 'Tham số không hợp lệ');

  const fee = await shippingService.calcShippingFee(result.data.province_code, result.data.subtotal);
  res.json({ success: true, data: fee });
}

// Public: thông tin ship tối thiểu cho FE (ngưỡng miễn phí) — không lộ cấu hình nội bộ
export async function getInfo(_req: Request, res: Response) {
  res.json({ success: true, data: await shippingService.getPublicShippingInfo() });
}

// ---------- Admin ----------

export async function adminListZones(_req: Request, res: Response) {
  res.json({ success: true, data: await shippingService.listShippingZones() });
}

export async function adminUpdateZone(req: Request, res: Response) {
  const zone = await shippingService.updateShippingZone(String(req.params.provinceCode), req.body);
  res.json({ success: true, data: zone });
}

// Lưu hàng loạt nhiều tỉnh (nút "Lưu tất cả")
export async function adminUpdateZonesBatch(req: Request, res: Response) {
  res.json({ success: true, data: await shippingService.updateShippingZonesBatch(req.body.zones) });
}

// Cấu hình kho + công thức phí theo khoảng cách (D62)
export async function adminGetConfig(_req: Request, res: Response) {
  res.json({ success: true, data: await shippingService.getAdminShippingConfig() });
}

export async function adminUpdateConfig(req: Request, res: Response) {
  // Lưu config xong tự tính lại distance_km cho 34 tỉnh
  res.json({ success: true, data: await shippingService.upsertShippingConfig(req.body) });
}
