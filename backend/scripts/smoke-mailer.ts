// Smoke test Resend — chạy: npx tsx scripts/smoke-mailer.ts [email-nhận]
// Gửi 1 email test thật qua Resend. Mục đích: xác nhận RESEND_API_KEY trong .env
// hợp lệ trước khi dùng email trong các luồng nghiệp vụ (Lát 2+).
import 'dotenv/config';
import { renderEmail } from '../src/lib/email-templates';
import { sendMail } from '../src/lib/mailer';

// Email nhận: ưu tiên đối số dòng lệnh, sau đó SMOKE_TEST_TO trong .env.
const to = process.argv[2] ?? process.env.SMOKE_TEST_TO;

async function main() {
  if (!to) {
    throw new Error(
      'Chưa có email nhận. Cách dùng: `npx tsx scripts/smoke-mailer.ts ban@gmail.com` ' +
        'hoặc đặt SMOKE_TEST_TO trong .env',
    );
  }

  console.log(`Đang gửi email test tới ${to} qua Resend...`);

  const html = renderEmail({
    title: 'Email test BookStore',
    heading: 'Hạ tầng email đã hoạt động 🎉',
    bodyHtml:
      '<p>Đây là email test xác nhận Resend đã được cấu hình đúng. ' +
      'Nếu bạn nhận được thư này thì Lát 1 (hạ tầng email) của Phase 6 đã sẵn sàng.</p>',
    ctaLabel: 'Về trang chủ',
    ctaUrl: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  });

  const id = await sendMail({
    to,
    subject: '[BookStore] Email test — hạ tầng email OK',
    html,
  });

  console.log('✔ Đã gửi. Mã thư Resend:', id || '(không có id)');
  console.log(
    '→ Kiểm tra hộp thư (kể cả mục Spam). Lưu ý: người gửi test mặc định của Resend ' +
      'chỉ giao được tới email CHỦ tài khoản Resend cho tới khi bạn xác minh domain riêng.',
  );
}

main().catch((e) => {
  console.error('✘ Smoke test thất bại — kiểm tra lại RESEND_API_KEY trong .env:', e?.message ?? e);
  process.exit(1);
});
