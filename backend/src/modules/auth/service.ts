import bcrypt from 'bcrypt';
import { createEmailToken, consumeEmailToken } from '../../lib/email-token';
import { signToken } from '../../lib/jwt';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { PUBLIC_USER_SELECT } from '../../utils/publicUser';
import { sendPasswordResetEmail, sendVerificationEmail } from '../notification/auth-email';
import type { LoginInput, RegisterInput } from './schemas';

export async function register(input: RegisterInput) {
  // Normalize email: Postgres unique phân biệt hoa/thường, không normalize thì
  // "A@test.com" và "a@test.com" thành 2 tài khoản khác nhau
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'Email đã được đăng ký');

  // bcrypt cost 10: mỗi lần hash ~100ms — đủ chậm để chống dò pass, đủ nhanh cho UX
  const password_hash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: { email, password_hash, name: input.name, phone: input.phone },
    select: PUBLIC_USER_SELECT,
  });

  // Gửi email xác thực (fail-soft): tạo token + gửi link. Lỗi gửi mail KHÔNG được làm
  // hỏng việc đăng ký — bọc try/catch, chỉ log. void = fire-and-forget không chờ gửi xong.
  try {
    const rawToken = await createEmailToken(user.id, 'verify_email');
    void sendVerificationEmail(user.email, user.name, rawToken);
  } catch (err) {
    logger.error('Không tạo được token xác thực email khi đăng ký (đã bỏ qua)', { err });
  }

  // Đăng ký xong cấp token luôn — user không phải login lại lần nữa
  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

// Xác thực email: tiêu thụ token verify_email (dùng 1 lần) rồi bật cờ email_verified.
export async function verifyEmail(rawToken: string) {
  const userId = await consumeEmailToken(rawToken, 'verify_email');
  await prisma.user.update({ where: { id: userId }, data: { email_verified: true } });
  return { verified: true };
}

// Gửi lại email xác thực cho user đang đăng nhập (req.user.id) — khi link cũ hết hạn.
export async function resendVerification(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, email_verified: true },
  });
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
  if (user.email_verified) throw new AppError(400, 'Email đã được xác thực');

  const rawToken = await createEmailToken(user.id, 'verify_email');
  await sendVerificationEmail(user.email, user.name, rawToken);
  return { sent: true };
}

// Quên mật khẩu — gửi link đặt lại. CHỐNG DÒ TÀI KHOẢN (anti-enumeration):
// LUÔN trả về CÙNG một thông báo dù email có tồn tại hay không (giống bài học login).
// Chỉ THỰC SỰ gửi mail khi user tồn tại + có mật khẩu (tài khoản OAuth không có pass để đặt lại).
export async function forgotPassword(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, password_hash: true },
  });

  // Fire-and-forget (KHÔNG await): nếu chờ tạo token + gọi Resend cho email TỒN TẠI thì
  // response chậm hơn hẳn email KHÔNG tồn tại (trả ngay) → kẻ tấn công đo độ trễ vẫn dò
  // được tài khoản dù thông báo giống nhau (timing oracle). Bắn nền để thời gian phản hồi
  // như nhau ở cả 2 nhánh — đây mới là chống dò tài khoản trọn vẹn.
  if (user?.password_hash) {
    const { id, email: userEmail, name } = user;
    void (async () => {
      try {
        const rawToken = await createEmailToken(id, 'reset_password');
        await sendPasswordResetEmail(userEmail, name, rawToken);
      } catch (err) {
        logger.error('Không gửi được email đặt lại mật khẩu (đã bỏ qua)', { err });
      }
    })();
  }

  return { message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.' };
}

// Đặt lại mật khẩu — tiêu thụ token reset_password (dùng 1 lần) rồi đổi mật khẩu.
// Trade-off JWT thuần (đã ghi từ Phase 1): token đăng nhập cũ vẫn sống tới hết hạn 7d;
// thu hồi ngay cần RefreshToken (tier NICE, ngoài scope).
export async function resetPassword(rawToken: string, newPassword: string) {
  const userId = await consumeEmailToken(rawToken, 'reset_password');
  const password_hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password_hash } });
  return { reset: true };
}

export async function login(input: LoginInput) {
  // Normalize giống register — user gõ "A@Test.com" vẫn login được tài khoản "a@test.com"
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Cùng MỘT thông báo cho "email không tồn tại" và "sai mật khẩu":
  // không cho kẻ tấn công dò được email nào đã đăng ký (user enumeration)
  const invalidError = new AppError(401, 'Email hoặc mật khẩu không đúng');

  // password_hash null = tài khoản OAuth (NICE sau này) — không login bằng password được
  if (!user?.password_hash) throw invalidError;

  const passwordOk = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordOk) throw invalidError;

  const token = signToken({ sub: user.id, role: user.role });

  // Loại password_hash ra khỏi object trước khi trả về
  const { password_hash: _ignored, ...publicUser } = user;
  return { user: publicUser, token };
}
