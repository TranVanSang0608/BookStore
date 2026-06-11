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
