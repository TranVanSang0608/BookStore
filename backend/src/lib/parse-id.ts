import { AppError } from '../middleware/error';

// :id trên URL là string (Express 5 còn cho phép string[] nếu param lặp) —
// chỉ chấp nhận đúng 1 số nguyên dương, mọi thứ khác trả 400 ngay.
// (Dùng chung cho các module catalog, order...; address có bản riêng từ Phase 1.)
export function parseId(raw: string | string[]): number {
  const id = Number(raw);
  if (typeof raw !== 'string' || !Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'ID không hợp lệ');
  }
  return id;
}
