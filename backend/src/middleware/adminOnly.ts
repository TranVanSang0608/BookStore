import { NextFunction, Request, Response } from 'express';

// TODO Phase 1 (Auth): chạy SAU middleware auth, kiểm tra req.user.role === 'admin',
// nếu không phải admin thì trả 403.
export function adminOnly(_req: Request, _res: Response, _next: NextFunction) {
  throw new Error('adminOnly middleware chưa được implement — sẽ làm ở Phase 1');
}
