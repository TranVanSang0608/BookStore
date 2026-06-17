import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import * as controller from './controller';

const router = Router();

// Số liệu kinh doanh — chỉ admin xem được. auth (401 nếu chưa đăng nhập) → adminOnly (403 nếu không phải admin).
router.get('/', auth, adminOnly, controller.getDashboard);

export default router;
