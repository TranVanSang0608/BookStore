import 'dotenv/config'; // nạp .env TRƯỚC các import khác (app.ts có đọc process.env)
import app from './app';
import { logger } from './lib/logger';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  logger.info(`Server chạy tại http://localhost:${PORT}`);
});
