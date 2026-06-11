// Mở rộng kiểu Request của Express bằng "declaration merging":
// TypeScript gộp interface Request khai báo ở đây với interface gốc của Express,
// nhờ vậy mọi handler đều thấy req.user (sau khi đã qua middleware auth).
import type { Role } from '../generated/prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: Role };
    }
  }
}

export {};
