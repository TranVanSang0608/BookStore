import { Router } from 'express';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { chatRequestSchema } from './schemas';

const router = Router();

// POST /api/chat — validate body { messages } rồi gọi controller.
// Rate-limit (10 tin/phút/IP) gắn ở app.ts khi mount, giống cách /api/auth có authLimiter.
router.post('/', validate(chatRequestSchema), controller.postChat);

export default router;
