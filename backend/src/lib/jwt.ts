import jwt from 'jsonwebtoken';
import type { Role } from '../generated/prisma/client';

// Payload trong token: TỐI THIỂU — chỉ id (claim chuẩn "sub") + role.
// Không nhét email/name vào token: thông tin đổi được thì lấy từ DB, token thì không sửa được.
export interface JwtPayload {
  sub: number;
  role: Role;
}

// Đọc secret mỗi lần dùng (không cache lúc import) để chắc chắn dotenv đã nạp xong;
// thiếu secret thì fail ngay với thông báo rõ ràng thay vì ký token bằng undefined.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Thiếu JWT_SECRET trong .env');
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

// Ném lỗi nếu token sai chữ ký hoặc hết hạn — middleware auth sẽ bắt và trả 401.
// jwt.verify trả kiểu rộng (string | object) nên cần ép kiểu qua unknown;
// an toàn vì token do chính ta ký với payload dạng JwtPayload.
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as unknown as JwtPayload;
}
