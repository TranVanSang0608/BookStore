import { Request, Response } from 'express';
import * as chatService from './service';

// Controller chỉ gọi service + trả response (không try/catch: Express 5 tự đẩy lỗi về error handler).
// Public: khách kể cả CHƯA đăng nhập cũng chat được (chỉ đọc catalog công khai, không đụng dữ liệu riêng).
export async function postChat(req: Request, res: Response) {
  const result = await chatService.chat(req.body.messages);
  res.json({ success: true, data: result });
}
