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
import dashboardRoutes from './modules/dashboard/routes';
import orderRoutes from './modules/order/routes';
import paymentRoutes from './modules/payment/routes';
import healthRoutes from './modules/health/routes';
import locationsRoutes from './modules/locations/routes';
import shippingRoutes from './modules/shipping/routes';
import uploadRoutes from './modules/upload/routes';
import reviewRoutes from './modules/review/routes';
import settingsRoutes from './modules/settings/routes';
import userRoutes from './modules/user/routes';
import voucherRoutes from './modules/voucher/routes';
import wishlistRoutes from './modules/wishlist/routes';
import chatRoutes from './modules/chat/routes';

// Cấu hình Express app — tách riêng khỏi server.ts để sau này
// Jest/Supertest có thể import app test trực tiếp mà không cần mở port.
const app = express();

// Khi deploy sau proxy (Render/Railway/Nginx), req.ip là IP proxy + có header X-Forwarded-For.
// express-rate-limit cần 'trust proxy' để lấy ĐÚNG IP client (nếu không sẽ gộp mọi user thành 1 IP,
// hoặc ném ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
//
// Cấu hình qua env TRUST_PROXY (số hop, vd '1'; hoặc '0'/'false' để TẮT). Mặc định: bật 1 hop ở
// production (đúng cho Render/Railway), tắt ở dev. CẢNH BÁO: nếu Node bị expose TRỰC TIẾP ra
// internet (không có reverse proxy), phải đặt TRUST_PROXY=0 — nếu không attacker tự gửi
// X-Forwarded-For giả để né rate-limit theo IP.
const trustProxy = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '0');
const configuredOrigins = (process.env.FRONTEND_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? configuredOrigins
    : [...new Set([...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173'])];

if (trustProxy !== '0' && trustProxy !== 'false') {
  const hops = Number(trustProxy);
  app.set('trust proxy', Number.isNaN(hops) ? trustProxy : hops); // số → số hop; chuỗi khác → để Express tự hiểu
}

app.use(helmet()); // bộ security headers (CSP, X-Frame-Options...)
app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : 'http://localhost:5173' })); // chỉ cho phép FE gọi API
app.use(express.json()); // parse JSON body

// Chống brute-force password: mỗi IP tối đa 20 request vào /api/auth/* trong 15 phút
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true, // trả header RateLimit-* cho client biết quota còn lại
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút' },
});

// Rate limit CHUNG (nhẹ) cho toàn bộ API public — chống spam làm chậm DB / hết quota server.
// Hạn mức rộng (1000 req/15p/IP ≈ 66 req/phút) để KHÔNG cản người dùng thật (duyệt + lọc + phân
// trang), chỉ chặn lưu lượng bất thường. Auth/chat vẫn có limiter riêng CHẶT hơn → 1 request có
// thể dính cả 2 tầng (phòng thủ nhiều lớp). Health check (/api/health) đăng ký TRƯỚC nên không bị tính.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút' },
});

app.use('/api/health', healthRoutes);
app.use('/api', globalLimiter); // áp cho mọi route /api phía dưới (health ở trên đã thoát)
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
// Voucher (Phase 7): preview mã giảm giá (checkout) + admin CRUD
app.use('/api/vouchers', voucherRoutes);
// Wishlist (Phase 8): thích/bỏ thích sách + danh sách yêu thích
app.use('/api/wishlist', wishlistRoutes);
// Review (Phase 8): đánh giá sách (verified purchase), list public
app.use('/api/reviews', reviewRoutes);
// Dashboard (Phase 9): số liệu tổng quan cho admin (KPI + chart)
app.use('/api/admin/dashboard', dashboardRoutes);
// Settings: thông tin shop (công khai để hiển thị) + admin cập nhật
app.use('/api/settings', settingsRoutes);

// Chatbot (Phase 11): proxy DeepSeek. 2 lớp rate-limit chống đốt tiền API key (mỗi tin gọi API tới 2 lần):
//  - chatLimiter: 10 tin/phút/IP — chặn 1 người spam.
//  - chatGlobalLimiter: trần TỔNG toàn hệ thống/ngày — chặn kẻ xoay nhiều IP đốt hết credit.
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn nhắn hơi nhanh, vui lòng thử lại sau 1 phút' },
});
const chatGlobalLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 500,
  legacyHeaders: false,
  keyGenerator: () => 'chat-global', // 1 khóa chung cho MỌI request → đếm gộp toàn hệ thống
  validate: false, // cố tình không dùng IP làm khóa → tắt cảnh báo keyGenerator của express-rate-limit
  message: { success: false, message: 'Trợ lý đã đạt giới hạn lượt hỏi trong ngày, bạn quay lại sau nhé' },
});
app.use('/api/chat', chatGlobalLimiter, chatLimiter, chatRoutes);

// Error handler PHẢI đăng ký sau cùng để hứng lỗi từ mọi route phía trên
app.use(errorHandler);

export default app;
