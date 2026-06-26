import { createHash, randomBytes } from 'node:crypto';
import type { EmailTokenType } from '../generated/prisma/client';
import { AppError } from '../middleware/error';
import { prisma } from './prisma';

// Token nhúng vào link email (xác thực email / đặt lại mật khẩu).
// Token THẬT là chuỗi ngẫu nhiên 64 hex — không đoán được. DB chỉ lưu HASH (SHA-256)
// của nó, GIỐNG cách lưu password_hash: lộ DB cũng không tái tạo được token gốc.
// Token dùng MỘT LẦN (used_at) + có hạn (expires_at).

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // link xác thực email sống 24 giờ
const RESET_TTL_MS = 60 * 60 * 1000; // link đặt lại mật khẩu sống 1 giờ (ngắn hơn cho an toàn)

// Băm token bằng SHA-256 (1 chiều). Dùng cả lúc lưu lẫn lúc tra → cùng input ra cùng hash.
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function ttlFor(type: EmailTokenType): number {
  return type === 'reset_password' ? RESET_TTL_MS : VERIFY_TTL_MS;
}

// Sinh token mới cho user + lưu HASH vào DB. Trả về token THẬT (raw) để nhúng vào link email.
// Đồng thời VÔ HIỆU mọi token cùng loại còn hiệu lực của user (đánh dấu đã dùng) — chỉ link
// MỚI NHẤT còn tác dụng. Tránh nhiều link reset/verify sống song song (thu hẹp cửa sổ tấn
// công nếu link cũ bị lộ). Cả 2 bước trong 1 transaction để không có khoảng "2 link cùng sống".
export async function createEmailToken(userId: number, type: EmailTokenType): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  await prisma.$transaction(async (tx) => {
    // KHÓA hàng User (FOR UPDATE) để SERIALIZE 2 request forgot/resend gần như đồng thời:
    // không khóa thì cả hai cùng updateMany token cũ RỒI cùng create → 2 link cùng sống (DB chỉ
    // unique theo token_hash, không ép "mỗi (user,type) 1 token active"). Khóa rồi thì request sau
    // xếp hàng sau request trước, updateMany của nó vô hiệu luôn token request trước vừa tạo
    // → chỉ link MỚI NHẤT còn tác dụng (đúng mục tiêu). Cùng họ pessimistic-lock đã dùng ở Phase 5/7.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    await tx.emailToken.updateMany({
      where: { user_id: userId, type, used_at: null },
      data: { used_at: new Date() },
    });
    await tx.emailToken.create({
      data: {
        user_id: userId,
        token_hash: hashToken(rawToken),
        type,
        expires_at: new Date(Date.now() + ttlFor(type)),
      },
    });
  });
  return rawToken;
}

// Tiêu thụ token (dùng MỘT LẦN): hợp lệ khi chưa dùng + chưa hết hạn + đúng type.
// Dùng updateMany có ĐIỀU KIỆN (compare-and-set atomic, cùng họ với trừ kho/hủy đơn):
// 2 lần bấm link gần nhau thì chỉ 1 lần "đặt used_at" thắng (count=1), lần kia count=0.
// Trả về user_id của token để service biết áp dụng cho ai.
export async function consumeEmailToken(rawToken: string, type: EmailTokenType): Promise<number> {
  const token_hash = hashToken(rawToken);
  const now = new Date();
  const claim = await prisma.emailToken.updateMany({
    where: { token_hash, type, used_at: null, expires_at: { gt: now } },
    data: { used_at: now },
  });
  if (claim.count !== 1) {
    throw new AppError(400, 'Liên kết không hợp lệ hoặc đã hết hạn');
  }
  // Vừa claim được (count=1) nên row chắc chắn tồn tại; vẫn check null thay vì non-null
  // assertion để lỡ row bị xóa xen giữa (rất hiếm) thì trả 400 đúng nghĩa, không phải 500.
  const token = await prisma.emailToken.findUnique({ where: { token_hash } });
  if (!token) throw new AppError(400, 'Liên kết không hợp lệ hoặc đã hết hạn');
  return token.user_id;
}
