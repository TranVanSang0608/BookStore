import { NextFunction, Request, Response } from 'express';

// TODO Phase 1 (Auth): verify JWT từ header "Authorization: Bearer <token>",
// giải mã và gán req.user = { id, role } cho các handler phía sau dùng.
export function auth(_req: Request, _res: Response, _next: NextFunction) {
  throw new Error('auth middleware chưa được implement — sẽ làm ở Phase 1');
}
