// Prisma 7: CLI đọc config từ file này (thay cho cấu hình trong package.json như bản cũ).
// Lưu ý: Prisma 7 KHÔNG tự nạp .env nữa — phải import dotenv ở đây để
// các lệnh `prisma migrate/generate/db seed` đọc được DATABASE_URL.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts', // lệnh chạy khi gọi `npx prisma db seed` (viết ở Bước 4)
  },
  // Prisma 7: URL kết nối DB cho lệnh migrate khai báo ở đây (không còn trong schema.prisma)
  datasource: {
    url: env('DATABASE_URL'),
  },
});
