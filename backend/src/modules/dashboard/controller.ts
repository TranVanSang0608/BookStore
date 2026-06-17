import { Request, Response } from 'express';
import * as dashboardService from './service';

// Controller chỉ gọi service + trả response (không try/catch — Express 5 forward lỗi).
export async function getDashboard(_req: Request, res: Response) {
  const data = await dashboardService.getDashboard();
  res.json({ success: true, data });
}
