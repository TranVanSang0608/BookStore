// Unit test cho buildOrderConfirmationEmail — hàm THUẦN (không DB, không gửi mạng).
import { buildOrderConfirmationEmail } from '../modules/notification/order-email';
import type { OrderEmailData } from '../modules/notification/order-email';

// order-email.ts import prisma (cho hàm gửi mail). Hàm build HTML không dùng tới, nhưng
// chỉ cần import module là Jest nạp generated Prisma client → lỗi internal/class.js
// (xem DEV-LOG Phase 4). Mock rỗng để chặn nạp client thật.
jest.mock('../lib/prisma', () => ({ prisma: {} }));

const base: OrderEmailData = {
  order_code: 'BK-20260615-AB12',
  subtotal: 200000,
  shipping_fee: 20000,
  total: 220000,
  note: null,
  payment_method: 'cod',
  shipping_recipient_name: 'Nguyễn Văn A',
  shipping_phone: '0900000000',
  shipping_province_name: 'Hà Nội',
  shipping_ward_name: 'Phường Cửa Nam',
  shipping_street: '12 Hàng Bài',
  customer_name: 'Nguyễn Văn A',
  items: [{ book_title: 'Nhà Giả Kim', book_author_name: 'Paulo Coelho', price_at_order: 100000, quantity: 2 }],
};

describe('buildOrderConfirmationEmail', () => {
  it('subject + html chứa mã đơn', () => {
    const { subject, html } = buildOrderConfirmationEmail(base);
    expect(subject).toContain('BK-20260615-AB12');
    expect(html).toContain('BK-20260615-AB12');
  });

  it('hiện tên sách, tác giả và tổng tiền (format VND)', () => {
    const { html } = buildOrderConfirmationEmail(base);
    expect(html).toContain('Nhà Giả Kim');
    expect(html).toContain('Paulo Coelho');
    expect(html).toContain('220.000đ'); // tổng cộng
  });

  it('COD và VNPay hiện nhãn thanh toán khác nhau', () => {
    expect(buildOrderConfirmationEmail(base).html).toContain('COD');
    expect(buildOrderConfirmationEmail({ ...base, payment_method: 'vnpay' }).html).toContain('VNPay');
  });

  it('COD nói "Đặt hàng thành công"; VNPay (chưa trả tiền) KHÔNG nói vậy mà nhắc thanh toán', () => {
    expect(buildOrderConfirmationEmail(base).html).toContain('Đặt hàng thành công');

    const vnpay = buildOrderConfirmationEmail({ ...base, payment_method: 'vnpay' });
    expect(vnpay.html).not.toContain('Đặt hàng thành công');
    expect(vnpay.html).toContain('hoàn tất thanh toán');
    expect(vnpay.subject).toContain('hoàn tất thanh toán');
  });

  it('phí ship 0 hiện "Miễn phí"', () => {
    expect(buildOrderConfirmationEmail({ ...base, shipping_fee: 0 }).html).toContain('Miễn phí');
  });

  it('chỉ hiện ghi chú khi có note', () => {
    expect(buildOrderConfirmationEmail(base).html).not.toContain('Ghi chú');
    expect(buildOrderConfirmationEmail({ ...base, note: 'Giao giờ hành chính' }).html).toContain(
      'Giao giờ hành chính',
    );
  });

  it('escape tên khách do user nhập (chống chèn HTML)', () => {
    const { html } = buildOrderConfirmationEmail({ ...base, customer_name: '<b>x</b>' });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
