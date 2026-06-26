import jwt from 'jsonwebtoken';
import type { Role } from '../generated/prisma/client';

// Payload trong token: TỐI THIỂU — id (claim chuẩn "sub"), role, và tv (token_version).
// Không nhét email/name: thông tin đổi được thì lấy từ DB, token thì không sửa được.
// `tv` để middleware auth đối chiếu với User.token_version trong DB — đổi mật khẩu thì
// token cũ (tv lệch) bị từ chối ngay. role trong token chỉ để tham khảo; auth ĐỌC role TỪ DB.
export interface JwtPayload {
  sub: number;
  role: Role;
  tv: number;
}

// Các giá trị MẪU/yếu phổ biến — TUYỆT ĐỐI không được dùng để ký token thật: ai cũng biết
// chuỗi mẫu nên có thể tự ký JWT giả mạo (vd token admin) mà backend vẫn verify qua chữ ký.
const PLACEHOLDER_SECRETS = new Set([
  'thay-bang-chuoi-ngau-nhien-dai',
  'changeme',
  'secret',
  'your-secret-key',
]);

// Đọc secret mỗi lần dùng (không cache lúc import) để chắc chắn dotenv đã nạp xong.
// Từ chối secret thiếu / là giá trị mẫu / (ở production) quá ngắn — thay vì ký bằng chuỗi yếu.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Thiếu JWT_SECRET trong .env');
  if (PLACEHOLDER_SECRETS.has(secret)) {
    throw new Error('JWT_SECRET đang là giá trị MẪU — tạo chuỗi ngẫu nhiên thật (>= 32 ký tự) trước khi chạy.');
  }
  // Ép độ dài tối thiểu ở production; dev/test cho ngắn để tiện (test dùng secret ngắn).
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('JWT_SECRET ở production phải dài >= 32 ký tự ngẫu nhiên.');
  }
  return secret;
}

// Gọi lúc KHỞI ĐỘNG (server.ts) để fail SỚM nếu secret thiếu/mẫu/yếu — thay vì lỗi ở request đầu.
export function assertJwtSecret(): void {
  getSecret();
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
