import 'dotenv/config'; // nạp .env TRƯỚC các import khác (app.ts có đọc process.env)
import app from './app';
import { startAutoCancelJob } from './jobs/auto-cancel-orders';
import { assertJwtSecret } from './lib/jwt';
import { logger } from './lib/logger';

// Fail SỚM nếu JWT_SECRET thiếu/mẫu/yếu — không cho server lên với secret không an toàn.
assertJwtSecret();

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  logger.info(`Server chạy tại http://localhost:${PORT}`);

  // Bật cron auto-hủy đơn Pending >24h. Đặt ở server.ts (sau listen) chứ KHÔNG ở app.ts:
  // Jest/Supertest import app để test sẽ không vô tình spawn cron.
  // Tắt khi chạy test hoặc khi cờ DISABLE_CRON=1 (vd dev không muốn cron chạy nền).
  if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_CRON !== '1') {
    startAutoCancelJob();
  }
});
