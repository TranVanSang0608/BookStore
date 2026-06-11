import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { changePasswordSchema, updateProfileSchema } from './schemas';

const router = Router();

// router.use(auth): TẤT CẢ route bên dưới đều yêu cầu đăng nhập —
// gắn 1 lần ở đây thay vì lặp lại từng route
router.use(auth);

router.get('/me', controller.getMe);
router.put('/me', validate(updateProfileSchema), controller.updateMe);
router.put('/me/password', validate(changePasswordSchema), controller.changePassword);

export default router;
