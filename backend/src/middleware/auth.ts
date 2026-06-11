import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';

// Middleware xác thực: đọc header "Authorization: Bearer <token>".
// Token hợp lệ → gán req.user = { id, role } cho các handler phía sau; sai/thiếu → 401.
// 401 = "chưa xác thực" (khác 403 = "đã xác thực nhưng không đủ quyền" — xem adminOnly).
export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
    return;
  }

  try {
    const payload = verifyToken(header.slice('Bearer '.length));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    // Chữ ký sai hoặc token hết hạn — không phân biệt trong thông báo (tránh lộ thông tin)
    res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
}
