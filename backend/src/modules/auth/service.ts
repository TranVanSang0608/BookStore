import bcrypt from 'bcrypt';
import { createEmailToken, consumeEmailToken } from '../../lib/email-token';
import { verifyGoogleIdToken } from '../../lib/google';
import { signToken } from '../../lib/jwt';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { PUBLIC_USER_SELECT } from '../../utils/publicUser';
import { sendPasswordResetEmail, sendVerificationEmail } from '../notification/auth-email';
import type { LoginInput, RegisterInput } from './schemas';

// P2002 = vi phạm ràng buộc unique của Prisma (ở đây là User.email khi 2 request cùng tạo)
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
}

export async function register(input: RegisterInput) {
  // Normalize email: Postgres unique phân biệt hoa/thường, không normalize thì
  // "A@test.com" và "a@test.com" thành 2 tài khoản khác nhau
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'Email đã được đăng ký');

  // bcrypt cost 10: mỗi lần hash ~100ms — đủ chậm để chống dò pass, đủ nhanh cho UX
  const password_hash = await bcrypt.hash(input.password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: { email, password_hash, name: input.name, phone: input.phone },
      select: PUBLIC_USER_SELECT,
    });
  } catch (err) {
    // Race: check ở trên qua nhưng 2 request cùng email tạo song song → 1 dính unique (P2002).
    // Trả 409 thân thiện thay vì để bubble thành 500.
    if (isUniqueViolation(err)) throw new AppError(409, 'Email đã được đăng ký');
    throw err;
  }

  // Gửi email xác thực (fail-soft): tạo token + gửi link. Lỗi gửi mail KHÔNG được làm
  // hỏng việc đăng ký — bọc try/catch, chỉ log. void = fire-and-forget không chờ gửi xong.
  try {
    const rawToken = await createEmailToken(user.id, 'verify_email');
    void sendVerificationEmail(user.email, user.name, rawToken);
  } catch (err) {
    logger.error('Không tạo được token xác thực email khi đăng ký (đã bỏ qua)', { err });
  }

  // Đăng ký xong cấp token luôn — user không phải login lại lần nữa.
  // User mới → token_version mặc định = 0 (DB default), nên tv: 0.
  const token = signToken({ sub: user.id, role: user.role, tv: 0 });
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
// TĂNG token_version → mọi JWT đăng nhập cũ bị vô hiệu NGAY (quan trọng khi đặt lại mật khẩu
// vì có thể tài khoản đang bị kẻ khác chiếm phiên): không còn phải chờ token hết hạn 7d.
export async function resetPassword(rawToken: string, newPassword: string) {
  const userId = await consumeEmailToken(rawToken, 'reset_password');
  const password_hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash, token_version: { increment: 1 } },
  });
  return { reset: true };
}

// Đăng nhập/đăng ký bằng Google (D60). FE gửi ID token (credential) lấy từ Google
// Identity Services; ở đây verify token rồi tìm-hoặc-tạo user, cấp JWT của hệ thống mình
// — trả về CÙNG shape { user, token } như login() để FE tái dùng nguyên flow đăng nhập.
export async function loginWithGoogle(credential: string) {
  // Thiếu cấu hình GOOGLE_CLIENT_ID là lỗi HỆ THỐNG (deploy sai), KHÔNG phải lỗi của user.
  // Kiểm tra TRƯỚC try để lỗi này bubble thành 500 thật, không bị nuốt thành 401 ở dưới.
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new AppError(500, 'Server chưa cấu hình đăng nhập Google (GOOGLE_CLIENT_ID)');
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(credential);
  } catch (err) {
    // Token giả/hết hạn/sai audience → coi như đăng nhập thất bại (không lộ chi tiết)
    logger.warn('Xác minh Google ID token thất bại', { err });
    throw new AppError(401, 'Đăng nhập Google thất bại, vui lòng thử lại');
  }

  // Google báo email CHƯA xác minh → TỪ CHỐI. Vì hệ thống link tài khoản theo email, nếu tin
  // email chưa verify thì kẻ xấu có thể đăng nhập bằng email người khác để chiếm/link nhầm tài khoản.
  if (!profile.email_verified) {
    throw new AppError(401, 'Email Google của bạn chưa được xác minh');
  }

  // Normalize email giống register/login (Postgres unique phân biệt hoa/thường)
  const email = profile.email.trim().toLowerCase();

  // Nhận diện user bằng email — an toàn vì Google đã xác minh quyền sở hữu email (đã chặn ở trên).
  // KHÔNG lưu google_id riêng: nếu sau này cần phân biệt nhà cung cấp thì thêm cột (NICE).
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // Tài khoản OAuth: password_hash = null (login bằng mật khẩu & forgot-password đã chặn
    // sẵn nhánh này từ Phase 1/6). email_verified = true vì Google đã xác minh.
    try {
      user = await prisma.user.create({
        data: { email, name: profile.name, password_hash: null, email_verified: true },
      });
    } catch (err) {
      // Race: 2 request đầu tiên cùng email chạy song song → 1 create thắng, request này
      // dính unique (P2002). Thay vì 500, đọc lại user mà request kia vừa tạo.
      if (!isUniqueViolation(err)) throw err;
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw err; // không phải race thật → ném lại lỗi gốc
    }
  } else if (!user.email_verified) {
    // User đã có (từng đăng ký bằng email/mật khẩu) nhưng chưa verify → Google verify hộ
    user = await prisma.user.update({ where: { id: user.id }, data: { email_verified: true } });
  }

  const token = signToken({ sub: user.id, role: user.role, tv: user.token_version ?? 0 });
  const { password_hash: _ignored, token_version: _tv, ...publicUser } = user;
  return { user: publicUser, token };
}

// Hash giả CỐ ĐỊNH để so sánh khi user không tồn tại / tài khoản OAuth không có mật khẩu.
// Mục đích: bcrypt.compare LUÔN chạy (cùng thời gian ~100ms) dù email có tồn tại hay không —
// chống kẻ tấn công đo độ trễ để dò email nào đã đăng ký (timing oracle).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('khong-bao-gio-khop-mat-khau-that', 10);

export async function login(input: LoginInput) {
  // Normalize giống register — user gõ "A@Test.com" vẫn login được tài khoản "a@test.com"
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Cùng MỘT thông báo cho "email không tồn tại" và "sai mật khẩu":
  // không cho kẻ tấn công dò được email nào đã đăng ký (user enumeration)
  const invalidError = new AppError(401, 'Email hoặc mật khẩu không đúng');

  // LUÔN chạy bcrypt.compare (kể cả khi không có user / tài khoản OAuth không có pass) để thời
  // gian phản hồi NHẤT QUÁN — chống dò email qua đo độ trễ (timing oracle). Dùng hash giả nếu thiếu.
  const passwordOk = await bcrypt.compare(input.password, user?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!user?.password_hash || !passwordOk) throw invalidError;

  const token = signToken({ sub: user.id, role: user.role, tv: user.token_version });

  // Loại password_hash + token_version ra khỏi object trước khi trả về
  const { password_hash: _ignored, token_version: _tv, ...publicUser } = user;
  return { user: publicUser, token };
}
