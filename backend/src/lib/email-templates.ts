// Ráp HTML cho email gửi đi. Đây là hàm THUẦN: không gọi mạng, không chạm DB
// → unit-test thẳng (giống toSlug). Mọi email của đồ án (xác nhận đơn, xác thực
// email, quên mật khẩu) đều bọc nội dung qua renderEmail() để đồng bộ giao diện.
//
// Lưu ý email HTML: ứng dụng mail (Gmail, Outlook...) KHÔNG nạp file CSS ngoài và
// lược bỏ <style> phức tạp → buộc dùng INLINE style + layout đơn giản (bảng/div).

const BRAND = 'BookStore';
const BRAND_COLOR = '#4f46e5'; // tím indigo — đồng bộ với theme FE

export interface EmailLayoutInput {
  /** Dùng cho thẻ <title> (tab khi mở email trên web) */
  title: string;
  /** Tiêu đề lớn hiển thị đầu thân email */
  heading: string;
  /** Nội dung HTML đã được nơi gọi build sẵn (text của user PHẢI escapeHtml trước) */
  bodyHtml: string;
  /** Chữ trên nút bấm — bỏ trống thì không render nút */
  ctaLabel?: string;
  /** Link nút bấm */
  ctaUrl?: string;
}

// Escape ký tự đặc biệt của HTML cho text do NGƯỜI DÙNG nhập (tên, tiêu đề sách...).
// Chống chèn thẻ HTML lạ vào email (cùng tinh thần "không tin input" của backend).
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Ráp 1 email hoàn chỉnh: header (tên shop) + thân + nút CTA (tùy chọn) + footer.
export function renderEmail(input: EmailLayoutInput): string {
  const { title, heading, bodyHtml, ctaLabel, ctaUrl } = input;

  // Nút CTA chỉ render khi có ĐỦ cả chữ lẫn link
  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<div style="text-align:center;margin:32px 0;">
           <a href="${escapeHtml(ctaUrl)}"
              style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;
                     text-decoration:none;padding:12px 28px;border-radius:8px;
                     font-weight:600;font-size:15px;">${escapeHtml(ctaLabel)}</a>
         </div>`
      : '';

  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:${BRAND_COLOR};padding:20px 28px;">
        <span style="color:#ffffff;font-size:20px;font-weight:700;">${BRAND}</span>
      </div>
      <div style="padding:28px;">
        <h1 style="font-size:20px;margin:0 0 16px;color:#111827;">${escapeHtml(heading)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151;">${bodyHtml}</div>
        ${ctaHtml}
      </div>
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin:16px 0 0;">
      © ${year} ${BRAND} — Website bán sách trực tuyến.<br />
      Email tự động, vui lòng không trả lời thư này.
    </p>
  </div>
</body>
</html>`;
}
