// Upload hàng loạt ảnh bìa sách lên Cloudinary + gán Book.cover_image_url.
// Chạy: npx tsx scripts/upload-covers.ts
//
// Cách dùng: bỏ ảnh bìa vào backend/covers/, ĐẶT TÊN FILE theo slug của sách
// (vd nha-gia-kim.webp). Script đọc từng ảnh → tìm sách theo slug → upload Cloudinary
// (public_id cố định = bookstore/covers/<slug>, overwrite=true nên chạy lại KHÔNG nhân đôi ảnh)
// → cập nhật cover_image_url. File không khớp slug nào sẽ bị bỏ qua (cảnh báo, không lỗi).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client';
import cloudinary from '../src/lib/cloudinary';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const COVERS_DIR = path.join(__dirname, '..', 'covers');
const IMG_RE = /\.(webp|jpe?g|png)$/i;

// Upload buffer với public_id cố định (chạy lại thì ghi đè, không tạo asset mới)
function uploadWithId(buffer: Buffer, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { public_id: publicId, overwrite: true, resource_type: 'image' },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('Cloudinary không trả về kết quả'));
          else resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}

async function main() {
  if (!fs.existsSync(COVERS_DIR)) {
    console.error(`✘ Không thấy folder ${COVERS_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(COVERS_DIR).filter((f) => IMG_RE.test(f));
  console.log(`Tìm thấy ${files.length} ảnh trong covers/\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const slug = file.replace(IMG_RE, ''); // bỏ đuôi .webp/.jpg/.png → còn slug
    const book = await prisma.book.findUnique({ where: { slug } });
    if (!book) {
      console.warn(`⚠ Bỏ qua "${file}" — không có sách nào slug "${slug}"`);
      skipped++;
      continue;
    }
    try {
      const buffer = fs.readFileSync(path.join(COVERS_DIR, file));
      const url = await uploadWithId(buffer, `bookstore/covers/${slug}`);
      await prisma.book.update({ where: { id: book.id }, data: { cover_image_url: url } });
      console.log(`✔ ${slug}`);
      ok++;
    } catch (e) {
      console.error(`✘ Lỗi "${file}": ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  console.log(`\nXong: ${ok} thành công · ${skipped} bỏ qua · ${failed} lỗi`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
