import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './book.controller';
import { createBookSchema, setActiveSchema, updateBookSchema } from './book.schemas';

const router = Router();

// Catalog là mặt tiền cửa hàng — GET công khai, KHÔNG yêu cầu đăng nhập
// (khác address: router.use(auth) cả file). Route admin gắn auth + adminOnly per-route.

// THỨ TỰ QUAN TRỌNG: '/admin' và '/batch' phải đăng ký TRƯỚC '/:slug' — Express match
// từ trên xuống, nếu để sau thì "admin"/"batch" sẽ bị '/:slug' bắt mất (coi là slug) → 404.
router.get('/admin', auth, adminOnly, controller.adminList);
router.get('/admin/:id', auth, adminOnly, controller.adminDetail); // form sửa cần cả sách đang ẩn
router.get('/batch', controller.batch); // public — guest cart enrich theo ids
router.get('/', controller.list);
router.get('/:slug', controller.detail);

router.post('/', auth, adminOnly, validate(createBookSchema), controller.create);
router.put('/:id', auth, adminOnly, validate(updateBookSchema), controller.update);
// Không có DELETE — sách chỉ ẩn/hiện qua is_active (đơn hàng cũ vẫn tham chiếu tới sách)
router.put('/:id/active', auth, adminOnly, validate(setActiveSchema), controller.setActive);

export default router;
