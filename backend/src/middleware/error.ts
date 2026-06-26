import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
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
    // Lỗi 5xx (lỗi phía server có chủ đích, vd thiếu cấu hình GOOGLE_CLIENT_ID): log chi tiết
    // phía server nhưng chỉ trả message CHUNG cho client — không lộ nội bộ ra ngoài.
    if (err.statusCode >= 500) {
      logger.error('AppError 5xx', { message: err.message, path: req.path });
      res.status(err.statusCode).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' });
      return;
    }
    // Lỗi 4xx (nghiệp vụ): trả message cụ thể để client biết sai gì.
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Lỗi từ multer (upload file): file quá to, sai field... — lỗi phía client → 400
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Ảnh vượt quá dung lượng tối đa 2MB'
        : 'File tải lên không hợp lệ';
    res.status(400).json({ success: false, message });
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
