import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import {
  updateShippingConfigSchema,
  updateShippingZoneSchema,
  updateShippingZonesBatchSchema,
} from './schemas';

const router = Router();

// Public: phí ship chỉ là config tính toán, không có gì riêng tư —
// trang checkout (đã RequireAuth phía FE) và cả guest xem trước đều gọi được
router.get('/fee', controller.getFee);

// Admin: xem + sửa bảng phí ship theo tỉnh (auth + adminOnly)
router.get('/admin/zones', auth, adminOnly, controller.adminListZones);
// Lưu hàng loạt — đặt TRƯỚC route có :provinceCode để không bị nuốt nhầm
router.put(
  '/admin/zones',
  auth,
  adminOnly,
  validate(updateShippingZonesBatchSchema),
  controller.adminUpdateZonesBatch,
);
router.put(
  '/admin/zones/:provinceCode',
  auth,
  adminOnly,
  validate(updateShippingZoneSchema),
  controller.adminUpdateZone,
);

// Admin: cấu hình kho + công thức phí theo khoảng cách (D62)
router.get('/admin/config', auth, adminOnly, controller.adminGetConfig);
router.put(
  '/admin/config',
  auth,
  adminOnly,
  validate(updateShippingConfigSchema),
  controller.adminUpdateConfig,
);

export default router;
