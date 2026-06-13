import { Request, Response } from 'express';
import { uploadImage } from '../../lib/cloudinary';
import { AppError } from '../../middleware/error';

export async function create(req: Request, res: Response) {
  // multer chỉ gán req.file khi form-data có field 'image' hợp lệ
  if (!req.file) throw new AppError(400, 'Chưa chọn file ảnh');

  // FE nhận url → tự gắn vào payload JSON khi tạo/sửa sách (cover_image_url) hoặc tác giả (photo_url)
  const result = await uploadImage(req.file.buffer, 'bookstore/covers');
  res.status(201).json({ success: true, data: result });
}
