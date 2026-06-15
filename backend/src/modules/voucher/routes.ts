import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { createVoucherSchema, previewVoucherSchema, updateVoucherSchema } from './schemas';

const router = Router();

// Preview mã giảm giá khi checkout — cần đăng nhập (kiểm per_user_limit).
router.post('/preview', auth, validate(previewVoucherSchema), controller.preview);

// Admin CRUD — tất cả gắn auth + adminOnly. Prefix /admin để tách khỏi route user.
router.get('/admin', auth, adminOnly, controller.adminList);
router.get('/admin/:id', auth, adminOnly, controller.adminDetail);
router.post('/admin', auth, adminOnly, validate(createVoucherSchema), controller.create);
router.put('/admin/:id', auth, adminOnly, validate(updateVoucherSchema), controller.update);
router.patch('/admin/:id/toggle', auth, adminOnly, controller.toggle);
router.delete('/admin/:id', auth, adminOnly, controller.remove);

export default router;
