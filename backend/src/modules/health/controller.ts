import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

// Endpoint kiểm tra server + database còn sống (FE và deploy platform ping vào đây).
// Express 5: hàm async ném lỗi sẽ tự rơi vào error handler, nhưng ở đây
// ta muốn server vẫn trả 200 kể cả khi DB rớt → tự try/catch phần DB.
export async function getHealth(_req: Request, res: Response) {
  let database = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`; // câu query nhẹ nhất để xác nhận DB phản hồi
  } catch {
    database = 'disconnected';
  }

  res.json({
    success: true,
    message: 'BookStore API đang chạy',
    database,
    timestamp: new Date().toISOString(),
  });
}
