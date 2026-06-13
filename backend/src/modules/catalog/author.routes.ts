import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './author.controller';
import { authorSchema } from './author.schemas';

const router = Router();

// Public — trang tác giả /author/:id và dropdown form admin đều đọc từ đây
router.get('/', controller.list);
router.get('/:id', controller.detail);

// Admin
router.post('/', auth, adminOnly, validate(authorSchema), controller.create);
router.put('/:id', auth, adminOnly, validate(authorSchema), controller.update);
router.delete('/:id', auth, adminOnly, controller.remove);

export default router;
