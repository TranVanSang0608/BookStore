import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { createAddressSchema, updateAddressSchema } from './schemas';

const router = Router();

// Sổ địa chỉ là dữ liệu riêng tư — toàn bộ route yêu cầu đăng nhập
router.use(auth);

router.get('/', controller.list);
router.post('/', validate(createAddressSchema), controller.create);
router.put('/:id', validate(updateAddressSchema), controller.update);
router.delete('/:id', controller.remove);
router.put('/:id/default', controller.setDefault);

export default router;
