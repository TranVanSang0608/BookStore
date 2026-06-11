import { NextFunction, Request, Response } from 'express';

// Middleware phân quyền: PHẢI đứng sau auth trong chuỗi middleware.
// Nếu quên gắn auth trước thì req.user là undefined → vẫn bị chặn (an toàn mặc định).
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Chỉ quản trị viên được phép thực hiện' });
    return;
  }
  next();
}
