import { Router } from 'express';
import multer from 'multer';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import * as controller from './controller';

// memoryStorage: giữ file trong RAM dưới dạng Buffer (không ghi ra đĩa) —
// vừa đủ để chuyển tiếp lên Cloudinary qua upload_stream, server không cần dọn file tạm.
// An toàn vì đã chặn 2MB/file và chỉ admin được gọi.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB — vượt quá multer ném MulterError (error.ts xử lý)
  fileFilter: (_req, file, cb) => {
    // Chỉ nhận đúng 3 định dạng ảnh đã chốt trong THIET-KE.md mục 7.
    // Lưu ý: file.mimetype là header do CLIENT khai — có thể giả mạo; đây chỉ là lớp chặn sớm.
    // Lớp chặn thật: Cloudinary đọc nội dung file, không phải ảnh sẽ từ chối upload.
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Chỉ chấp nhận ảnh .jpg, .png hoặc .webp'));
    }
  },
});

const router = Router();

// Upload là thao tác admin (gắn ảnh bìa sách / ảnh tác giả) — không mở cho user thường.
// Thứ tự middleware quan trọng: auth + adminOnly đứng TRƯỚC multer — request lạ bị chặn
// ngay từ header, server không tốn RAM nhận body file của người không có quyền.
// 'image' là tên field trong form-data mà FE phải dùng.
router.post('/', auth, adminOnly, upload.single('image'), controller.create);

export default router;
