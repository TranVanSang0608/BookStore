import { Request, Response } from 'express';
import { uploadImage } from '../../lib/cloudinary';
import { detectImageFormat } from '../../lib/image-signature';
import { AppError } from '../../middleware/error';

export async function create(req: Request, res: Response) {
  // multer chỉ gán req.file khi form-data có field 'image' hợp lệ
  if (!req.file) throw new AppError(400, 'Chưa chọn file ảnh');

  // Kiểm MAGIC BYTES (nội dung thật của file) — KHÔNG tin file.mimetype client khai (giả mạo được).
  // Đây là lớp chặn server-side; Cloudinary allowed_formats là lớp chặn cuối khi giải mã ảnh.
  if (!detectImageFormat(req.file.buffer)) {
    throw new AppError(400, 'Nội dung file không phải ảnh .jpg, .png hoặc .webp hợp lệ');
  }

  // FE nhận url → tự gắn vào payload JSON khi tạo/sửa sách (cover_image_url) hoặc tác giả (photo_url)
  const result = await uploadImage(req.file.buffer, 'bookstore/covers');
  res.status(201).json({ success: true, data: result });
}
