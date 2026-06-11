import { Router } from 'express';
import * as controller from './controller';

// Route PUBLIC (không cần đăng nhập): form địa chỉ ở trang đăng ký/checkout
// cần dropdown tỉnh/xã trước khi user có tài khoản
const router = Router();

router.get('/provinces', controller.getProvinces);
router.get('/provinces/:code/wards', controller.getWards);

export default router;
