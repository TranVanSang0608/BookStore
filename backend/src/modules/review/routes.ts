import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { upsertReviewSchema } from './schemas';

const router = Router();

// Định danh theo bookId (FE có book.id từ trang chi tiết). List public; viết/xóa cần đăng nhập.
router.get('/book/:bookId/me', auth, controller.status); // trạng thái review của tôi (trước /book/:bookId)
router.get('/book/:bookId', controller.list);
router.post('/book/:bookId', auth, validate(upsertReviewSchema), controller.upsert);
router.delete('/book/:bookId', auth, controller.remove);

export default router;
