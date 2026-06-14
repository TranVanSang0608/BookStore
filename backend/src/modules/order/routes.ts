import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { adminUpdateStatusSchema, createOrderSchema } from './schemas';

const router = Router();

// Đơn hàng là dữ liệu riêng của user — toàn bộ route yêu cầu đăng nhập.
// Route admin gắn thêm adminOnly per-route.
router.use(auth);

// THỨ TỰ QUAN TRỌNG: '/admin*' đăng ký TRƯỚC '/:code' — nếu để sau, Express coi
// "admin" là một order_code và bắt nhầm (bài học từ book.routes /admin vs /:slug).
router.get('/admin', adminOnly, controller.adminList);
router.get('/admin/:id', adminOnly, controller.adminDetail);
router.put('/admin/:id/status', adminOnly, validate(adminUpdateStatusSchema), controller.adminUpdateStatus);

// User: đặt đơn từ giỏ, xem lịch sử + chi tiết (theo order_code), tự hủy đơn Pending
router.post('/', validate(createOrderSchema), controller.create);
router.get('/', controller.list);
router.get('/:code', controller.detail);
router.put('/:code/cancel', controller.cancel);

export default router;
