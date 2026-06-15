import { escapeHtml, renderEmail } from '../../lib/email-templates';
import { sendMailSafe } from '../../lib/mailer';

// Email liên quan tài khoản: xác thực email (Lát 3) + đặt lại mật khẩu (Lát 4).
// Cả hai đều nhúng token THẬT vào link trỏ về trang FE tương ứng.

function frontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
}

// Gửi email xác thực — link tới trang FE /verify-email?token=... (FE sẽ gọi API xác thực).
export async function sendVerificationEmail(email: string, name: string, rawToken: string): Promise<void> {
  const url = `${frontendOrigin()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const html = renderEmail({
    title: 'Xác thực email BookStore',
    heading: 'Xác thực địa chỉ email',
    bodyHtml: `
      <p>Xin chào ${escapeHtml(name)},</p>
      <p>Cảm ơn bạn đã đăng ký BookStore. Nhấn nút bên dưới để xác thực email này.
         Liên kết có hiệu lực trong <strong>24 giờ</strong>.</p>
      <p style="color:#6b7280;font-size:13px;">Nếu bạn không tạo tài khoản này, hãy bỏ qua email.</p>`,
    ctaLabel: 'Xác thực email',
    ctaUrl: url,
  });
  await sendMailSafe({ to: email, subject: '[BookStore] Xác thực địa chỉ email', html });
}

// Gửi email đặt lại mật khẩu — link tới trang FE /reset-password?token=... (hạn 1 giờ).
export async function sendPasswordResetEmail(email: string, name: string, rawToken: string): Promise<void> {
  const url = `${frontendOrigin()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const html = renderEmail({
    title: 'Đặt lại mật khẩu BookStore',
    heading: 'Yêu cầu đặt lại mật khẩu',
    bodyHtml: `
      <p>Xin chào ${escapeHtml(name)},</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản này. Nhấn nút bên dưới
         để đặt mật khẩu mới. Liên kết có hiệu lực trong <strong>1 giờ</strong>.</p>
      <p style="color:#6b7280;font-size:13px;">Nếu bạn không yêu cầu, hãy bỏ qua email này —
         mật khẩu của bạn vẫn không thay đổi.</p>`,
    ctaLabel: 'Đặt lại mật khẩu',
    ctaUrl: url,
  });
  await sendMailSafe({ to: email, subject: '[BookStore] Đặt lại mật khẩu', html });
}
