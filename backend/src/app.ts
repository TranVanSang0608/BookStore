import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { errorHandler } from './middleware/error';
import addressRoutes from './modules/address/routes';
import authRoutes from './modules/auth/routes';
import authorRoutes from './modules/catalog/author.routes';
import bookRoutes from './modules/catalog/book.routes';
import categoryRoutes from './modules/catalog/category.routes';
import cartRoutes from './modules/cart/routes';
import orderRoutes from './modules/order/routes';
import paymentRoutes from './modules/payment/routes';
import healthRoutes from './modules/health/routes';
import locationsRoutes from './modules/locations/routes';
import shippingRoutes from './modules/shipping/routes';
import uploadRoutes from './modules/upload/routes';
import userRoutes from './modules/user/routes';

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
app.use('/api/users', userRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/addresses', addressRoutes);
// Catalog (Phase 2): 1 module nhưng 3 prefix REST riêng cho 3 resource
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/uploads', uploadRoutes);
// Cart + Shipping (Phase 3): giỏ hàng DB của user đã đăng nhập + tính phí ship theo zone
app.use('/api/cart', cartRoutes);
app.use('/api/shipping', shippingRoutes);
// Order (Phase 4): đặt/hủy đơn (transaction) + admin quản lý đơn
app.use('/api/orders', orderRoutes);
// Payment (Phase 5): khởi tạo + callback (return/ipn) VNPay
app.use('/api/payments', paymentRoutes);

// Error handler PHẢI đăng ký sau cùng để hứng lỗi từ mọi route phía trên
app.use(errorHandler);

export default app;
