import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './controller';
import { addItemSchema, mergeCartSchema, updateItemSchema } from './schemas';

const router = Router();

// Giỏ hàng trong DB là dữ liệu riêng của từng user — toàn bộ route yêu cầu đăng nhập.
// (Guest cart nằm ở localStorage phía FE, không đụng tới các route này cho tới khi login.)
router.use(auth);

router.get('/', controller.get);
router.post('/items', validate(addItemSchema), controller.addItem);
// Dòng giỏ định danh bằng book_id (không phải CartItem id): nhờ @@unique([cart_id, book_id])
// mỗi sách chỉ có 1 dòng, và FE (nhất là guest cart) chỉ biết book_id
router.put('/items/:bookId', validate(updateItemSchema), controller.updateItem);
router.delete('/items/:bookId', controller.removeItem);
router.post('/merge', validate(mergeCartSchema), controller.merge);

export default router;
