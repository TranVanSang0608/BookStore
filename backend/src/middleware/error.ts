import { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';

// Lỗi nghiệp vụ có chủ đích, ví dụ: throw new AppError(409, 'Email đã tồn tại')
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

// Error handler tập trung — MỌI lỗi trong app đều đổ về đây, format JSON nhất quán.
// Express 5: route handler async bị reject sẽ TỰ ĐỘNG chuyển tới đây (không cần try/catch từng route).
// Lưu ý: phải khai báo đủ 4 tham số thì Express mới nhận diện đây là error middleware.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Lỗi 4xx từ middleware có sẵn của Express (vd: express.json() gặp body JSON sai cú pháp
  // sẽ ném lỗi { status: 400, type: 'entity.parse.failed' }) — trả đúng status đó,
  // không quy về 500 vì đây là lỗi phía client chứ không phải lỗi hệ thống
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: number }).status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ success: false, message: 'Yêu cầu không hợp lệ' });
      return;
    }
  }

  // Lỗi không lường trước: log đầy đủ để debug, nhưng KHÔNG trả chi tiết nội bộ cho client
  logger.error('Unhandled error', { err, path: req.path });
  res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' });
}
