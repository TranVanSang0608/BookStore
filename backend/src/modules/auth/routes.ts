import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './schemas';

const router = Router();

// Chuỗi middleware mỗi route: validate input → controller
router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);

// Xác thực email: verify-email công khai (FE cầm token từ link); resend cần đăng nhập
router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
router.post('/resend-verification', auth, controller.resendVerification);

// Quên / đặt lại mật khẩu — cả 2 công khai (user chưa đăng nhập được mới cần dùng)
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

export default router;
