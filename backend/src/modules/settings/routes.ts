import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { updateSettingsSchema } from './schemas';

const router = Router();

// Công khai: thông tin shop (hotline/email/địa chỉ) hiển thị ở footer + navbar
router.get('/', controller.getPublic);

// Admin cập nhật — gắn auth + adminOnly + validate body
router.put('/admin', auth, adminOnly, validate(updateSettingsSchema), controller.adminUpdate);

export default router;
