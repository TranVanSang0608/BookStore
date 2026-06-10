import { v2 as cloudinary } from 'cloudinary';

// SDK tự đọc credentials từ biến môi trường CLOUDINARY_URL
// (dạng cloudinary://api_key:api_secret@cloud_name — lấy trong Console > Settings > API Keys).
// secure: true → mọi URL trả về đều là https.
cloudinary.config({ secure: true });

export interface UploadResult {
  url: string; // secure_url — lưu vào Book.cover_image_url
  public_id: string; // cần giữ để xóa/thay ảnh trên Cloudinary sau này
}

// Upload 1 ảnh từ Buffer (Phase 2: multer memoryStorage đưa file.buffer vào đây).
// Dùng upload_stream vì ảnh nằm trong RAM, không ghi file tạm ra đĩa.
export function uploadImage(buffer: Buffer, folder = 'bookstore'): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'image' }, (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary không trả về kết quả'));
          return;
        }
        resolve({ url: result.secure_url, public_id: result.public_id });
      })
      .end(buffer);
  });
}

// Xóa ảnh theo public_id (dùng khi admin đổi/xóa ảnh bìa sách)
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
