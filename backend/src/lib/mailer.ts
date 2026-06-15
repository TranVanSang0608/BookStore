import { Resend } from 'resend';
import { logger } from './logger';

// "Đường ống" gửi email dùng chung cho cả đồ án (xác nhận đơn, xác thực email,
// quên mật khẩu). Toàn bộ chi tiết Resend gói gọn ở đây — nơi khác chỉ gọi
// sendMail/sendMailSafe, không cần biết dùng dịch vụ nào (D50).

// Đọc cấu hình MỖI LẦN dùng (không đọc lúc import) để chắc dotenv đã nạp xong —
// cùng pattern getVnpConfig (vnpay.ts) và getSecret (jwt.ts). Thiếu key → báo rõ.
function getMailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  // Người gửi mặc định: domain test của Resend (chỉ gửi được tới email chủ tài khoản).
  // Khi có domain riêng đã xác minh thì đổi MAIL_FROM trong .env.
  const from = process.env.MAIL_FROM ?? 'BookStore <onboarding@resend.dev>';
  if (!apiKey) {
    throw new Error('Thiếu RESEND_API_KEY trong .env — không gửi được email');
  }
  return { apiKey, from };
}

// Có cấu hình email chưa? Dùng để bỏ qua êm khi dev quên điền key (không làm hỏng app).
export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
}

// Gửi email và NÉM LỖI nếu thất bại. Dùng khi nơi gọi cần biết kết quả thật
// (vd: smoke test). Luồng nghiệp vụ chính nên dùng sendMailSafe bên dưới.
export async function sendMail(input: SendMailInput): Promise<string> {
  const { apiKey, from } = getMailConfig();
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (error) {
    throw new Error(`Resend gửi mail thất bại: ${error.message ?? JSON.stringify(error)}`);
  }
  return data?.id ?? ''; // id = mã thư Resend, hữu ích khi tra log
}

// Gửi email kiểu "fail-soft": NUỐT mọi lỗi (chỉ log), KHÔNG bao giờ ném ra ngoài.
// Đây là hàm dùng trong mọi luồng nghiệp vụ chính (đặt đơn, đăng ký...): email là
// phụ trợ, mạng/Resend trục trặc cũng KHÔNG được làm hỏng việc chính. Trả về true/false
// để nơi gọi biết đã gửi hay chưa (nếu cần), nhưng không phải xử lý lỗi.
export async function sendMailSafe(input: SendMailInput): Promise<boolean> {
  try {
    if (!isMailerConfigured()) {
      logger.warn('Bỏ qua gửi email: chưa cấu hình RESEND_API_KEY');
      return false;
    }
    await sendMail(input);
    return true;
  } catch (err) {
    logger.error('Gửi email thất bại (đã bỏ qua, không ảnh hưởng luồng chính)', { err });
    return false;
  }
}
