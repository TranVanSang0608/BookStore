import { Request, Response } from 'express';
import * as authService from './service';

// Controller chỉ làm 2 việc: gọi service + trả response.
// Không try/catch: Express 5 tự chuyển AppError từ service vào error handler tập trung.

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result }); // 201 Created
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
}

// Public: FE gửi token (lấy từ link email) để xác thực email.
export async function verifyEmail(req: Request, res: Response) {
  const result = await authService.verifyEmail(req.body.token);
  res.json({ success: true, data: result });
}

// Cần đăng nhập: gửi lại email xác thực cho chính user đang đăng nhập.
export async function resendVerification(req: Request, res: Response) {
  const result = await authService.resendVerification(req.user!.id);
  res.json({ success: true, data: result });
}

// Public: yêu cầu gửi link đặt lại mật khẩu (luôn trả thông báo chung — anti-enumeration).
export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ success: true, data: result });
}

// Public: đặt mật khẩu mới bằng token từ link email.
export async function resetPassword(req: Request, res: Response) {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, data: result });
}
