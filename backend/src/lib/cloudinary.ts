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
      // allowed_formats: Cloudinary GIẢI MÃ ảnh và từ chối nếu định dạng thật không thuộc danh sách
      // → lớp chặn cuối, cùng với kiểm magic bytes ở controller (không tin mimetype client khai).
      .upload_stream({ folder, resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }, (error, result) => {
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

// Chặn admin nhập URL ảnh NGOÀI (tránh tracking IP/UA của khách + bypass rule upload):
// chỉ chấp nhận URL giao ảnh của CHÍNH Cloudinary account này. Đọc cloud_name lazy (lúc validate
// request, env đã nạp). Chưa cấu hình cloud_name → từ chối hết (fail-closed, an toàn mặc định).
export function isOwnCloudinaryUrl(url: string): boolean {
  const cloudName = cloudinary.config().cloud_name;
  if (!cloudName) return false;
  return url.startsWith(`https://res.cloudinary.com/${cloudName}/`);
}

export default cloudinary;
