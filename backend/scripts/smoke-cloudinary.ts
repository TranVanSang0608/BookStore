// Smoke test Cloudinary — chạy: npx tsx scripts/smoke-cloudinary.ts
// Upload 1 ảnh PNG 1x1 pixel thật lên folder bookstore/smoke-test rồi xóa ngay.
// Mục đích: xác nhận CLOUDINARY_URL trong .env hợp lệ trước khi vào Phase 2 (upload ảnh bìa).
import 'dotenv/config';
import { deleteImage, uploadImage } from '../src/lib/cloudinary';

// PNG 1x1 pixel hợp lệ, mã hóa base64 — không cần file ảnh thật trên đĩa
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  console.log('Đang upload ảnh test lên Cloudinary...');
  const result = await uploadImage(Buffer.from(TINY_PNG_BASE64, 'base64'), 'bookstore/smoke-test');
  console.log('✔ Upload OK:', result.url);

  await deleteImage(result.public_id);
  console.log('✔ Đã xóa ảnh test — Cloudinary sẵn sàng cho Phase 2');
}

main().catch((e) => {
  console.error('✘ Smoke test thất bại — kiểm tra lại CLOUDINARY_URL trong .env:', e?.message ?? e);
  process.exit(1);
});
