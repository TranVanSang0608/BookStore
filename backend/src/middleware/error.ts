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

  // Lỗi không lường trước: log đầy đủ để debug, nhưng KHÔNG trả chi tiết nội bộ cho client
  logger.error('Unhandled error', { err, path: req.path });
  res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' });
}
