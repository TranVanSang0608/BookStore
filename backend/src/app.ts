import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler } from './middleware/error';
import authRoutes from './modules/auth/routes';
import healthRoutes from './modules/health/routes';

// Cấu hình Express app — tách riêng khỏi server.ts để sau này
// Jest/Supertest có thể import app test trực tiếp mà không cần mở port.
const app = express();

app.use(helmet()); // bộ security headers (CSP, X-Frame-Options...)
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' })); // chỉ cho phép FE gọi API
app.use(express.json()); // parse JSON body

// Chống brute-force password: mỗi IP tối đa 20 request vào /api/auth/* trong 15 phút
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true, // trả header RateLimit-* cho client biết quota còn lại
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' },
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);

// Error handler PHẢI đăng ký sau cùng để hứng lỗi từ mọi route phía trên
app.use(errorHandler);

export default app;
