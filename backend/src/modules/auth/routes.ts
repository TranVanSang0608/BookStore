import { Router } from 'express';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { loginSchema, registerSchema } from './schemas';

const router = Router();

// Chuỗi middleware mỗi route: validate input → controller
router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);

export default router;
