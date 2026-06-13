import { Router } from 'express';
import * as controller from './controller';

const router = Router();

// Public: phí ship chỉ là config tính toán, không có gì riêng tư —
// trang checkout (đã RequireAuth phía FE) và cả guest xem trước đều gọi được
router.get('/fee', controller.getFee);

export default router;
