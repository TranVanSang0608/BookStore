import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

// Middleware xác thực: đọc header "Authorization: Bearer <token>".
// Token hợp lệ → gán req.user = { id, role } cho các handler phía sau; sai/thiếu → 401.
// 401 = "chưa xác thực" (khác 403 = "đã xác thực nhưng không đủ quyền" — xem adminOnly).
//
// Sau khi verify chữ ký, CÒN đối chiếu với DB (1 truy vấn/req): token_version phải khớp
// (đổi/đặt lại mật khẩu sẽ tăng số này → token cũ bị loại ngay, không chờ hết hạn 7d) và
// role lấy TƯƠI TỪ DB (gỡ quyền admin trong DB là có hiệu lực ngay, không kẹt trong token cũ).
export async function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Bạn chưa đăng nhập' });
    return;
  }

  const unauthorized = () =>
    res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });

  let payload;
  try {
    payload = verifyToken(header.slice('Bearer '.length));
  } catch {
    // Chữ ký sai hoặc token hết hạn — không phân biệt trong thông báo (tránh lộ thông tin)
    unauthorized();
    return;
  }

  // Token đúng chữ ký nhưng phải còn khớp DB: user còn tồn tại + token_version khớp.
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, token_version: true },
  });
  if (!user || user.token_version !== (payload.tv ?? 0)) {
    unauthorized();
    return;
  }

  req.user = { id: user.id, role: user.role }; // role tươi từ DB, KHÔNG dùng role trong token
  next();
}
