import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './category.controller';
import { categorySchema } from './category.schemas';

const router = Router();

// Public — FE cần danh sách thể loại cho bộ lọc ở trang /books
router.get('/', controller.list);

// Admin
router.post('/', auth, adminOnly, validate(categorySchema), controller.create);
router.put('/:id', auth, adminOnly, validate(categorySchema), controller.update);
router.delete('/:id', auth, adminOnly, controller.remove);

export default router;
