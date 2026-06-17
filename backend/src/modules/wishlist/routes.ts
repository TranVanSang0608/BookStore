import { Router } from 'express';
import { auth } from '../../middleware/auth';
import * as controller from './controller';

const router = Router();

// Wishlist là dữ liệu riêng của user → cả file cần đăng nhập
router.use(auth);

router.get('/', controller.list); // sách đã thích (đầy đủ card)
router.get('/ids', controller.ids); // chỉ [book_id] — FE tô tim trên thẻ sách
router.post('/:bookId/toggle', controller.toggle); // thích / bỏ thích

export default router;
