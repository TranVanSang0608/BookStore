import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { createVnpaySchema } from './schemas';

const router = Router();

// Khởi tạo thanh toán — cần đăng nhập (chỉ chủ đơn được trả tiền)
router.post('/vnpay/create', auth, validate(createVnpaySchema), controller.createVnpay);

// Callback từ VNPay — PUBLIC (VNPay không gửi JWT được):
// - return: trình duyệt user redirect về (chạy được trên localhost)
// - ipn: server VNPay gọi thẳng (cần URL công khai / ngrok khi deploy)
// Cả hai đều tự verify chữ ký trước khi đụng DB.
router.get('/vnpay/return', controller.vnpayReturn);
router.get('/vnpay/ipn', controller.vnpayIpn);

export default router;
