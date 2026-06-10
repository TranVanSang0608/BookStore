import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error';
import healthRoutes from './modules/health/routes';

// Cấu hình Express app — tách riêng khỏi server.ts để sau này
// Jest/Supertest có thể import app test trực tiếp mà không cần mở port.
const app = express();

app.use(helmet()); // bộ security headers (CSP, X-Frame-Options...)
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' })); // chỉ cho phép FE gọi API
app.use(express.json()); // parse JSON body

app.use('/api/health', healthRoutes);

// Error handler PHẢI đăng ký sau cùng để hứng lỗi từ mọi route phía trên
app.use(errorHandler);

export default app;
