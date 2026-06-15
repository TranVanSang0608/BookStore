import { escapeHtml, renderEmail } from '../../lib/email-templates';
import { logger } from '../../lib/logger';
import { sendMailSafe } from '../../lib/mailer';
import { prisma } from '../../lib/prisma';

// Email "đã nhận đơn hàng" — gửi ngay sau khi user đặt đơn (cả COD lẫn VNPay).
// Là email báo shop đã nhận đơn, KHÔNG phải biên lai thanh toán.

// Format tiền VND: 30000 -> "30.000đ" (Node 25 có ICU đầy đủ nên 'vi-VN' ra dấu chấm)
function formatVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`;
}

function frontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
}

// Dữ liệu tối thiểu để dựng email — tách type riêng (không phụ thuộc Prisma) để
// hàm build HTML là hàm THUẦN, unit-test được mà không cần DB.
export interface OrderEmailData {
  order_code: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  note: string | null;
  payment_method: 'cod' | 'vnpay';
  shipping_recipient_name: string;
  shipping_phone: string;
  shipping_province_name: string;
  shipping_ward_name: string;
  shipping_street: string;
  customer_name: string;
  items: {
    book_title: string;
    book_author_name: string;
    price_at_order: number;
    quantity: number;
  }[];
}

// Build tiêu đề + thân HTML cho email xác nhận đơn. Hàm THUẦN.
export function buildOrderConfirmationEmail(data: OrderEmailData): { subject: string; html: string } {
  // Mỗi dòng hàng: tên sách + tác giả, số lượng × đơn giá, thành tiền bên phải
  const rows = data.items
    .map(
      (it) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">
        ${escapeHtml(it.book_title)}
        <span style="color:#9ca3af;">— ${escapeHtml(it.book_author_name)}</span>
        <br/><span style="color:#6b7280;font-size:13px;">SL: ${it.quantity} × ${formatVnd(it.price_at_order)}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
        ${formatVnd(it.price_at_order * it.quantity)}
      </td>
    </tr>`,
    )
    .join('');

  const payLabel =
    data.payment_method === 'vnpay'
      ? 'VNPay (thanh toán online)'
      : 'Thanh toán khi nhận hàng (COD)';
  const shipLabel = data.shipping_fee === 0 ? 'Miễn phí' : formatVnd(data.shipping_fee);

  // Đơn VNPay lúc gửi email mới Pending/CHƯA trả tiền → KHÔNG nói "thành công" (dễ hiểu nhầm,
  // chưa thanh toán còn bị auto-hủy 24h). COD thì coi như đã đặt xong (thu tiền khi giao).
  const isVnpay = data.payment_method === 'vnpay';
  const heading = isVnpay ? 'Đã nhận đơn hàng — chờ thanh toán' : 'Đặt hàng thành công 🎉';
  const introHtml = isVnpay
    ? `<p>Cảm ơn bạn đã đặt hàng tại BookStore. Chúng tôi đã ghi nhận đơn
         <strong>${escapeHtml(data.order_code)}</strong>. Vui lòng <strong>hoàn tất thanh toán qua VNPay</strong>
         để đơn được xử lý — đơn chưa thanh toán sẽ tự hủy sau 24 giờ.</p>`
    : `<p>Cảm ơn bạn đã đặt hàng tại BookStore. Chúng tôi đã nhận đơn
         <strong>${escapeHtml(data.order_code)}</strong> và đang xử lý.</p>`;

  const bodyHtml = `
    <p>Xin chào ${escapeHtml(data.customer_name)},</p>
    ${introHtml}

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>

    <table style="width:100%;font-size:14px;">
      <tr><td style="padding:2px 0;color:#6b7280;">Tạm tính</td>
          <td style="text-align:right;">${formatVnd(data.subtotal)}</td></tr>
      <tr><td style="padding:2px 0;color:#6b7280;">Phí vận chuyển</td>
          <td style="text-align:right;">${shipLabel}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;font-size:16px;">Tổng cộng</td>
          <td style="text-align:right;font-weight:700;font-size:16px;color:#4f46e5;">${formatVnd(data.total)}</td></tr>
    </table>

    <p style="margin-top:16px;"><strong>Giao tới:</strong><br/>
      ${escapeHtml(data.shipping_recipient_name)} — ${escapeHtml(data.shipping_phone)}<br/>
      ${escapeHtml(data.shipping_street)}, ${escapeHtml(data.shipping_ward_name)}, ${escapeHtml(data.shipping_province_name)}</p>
    <p><strong>Thanh toán:</strong> ${payLabel}</p>
    ${data.note ? `<p><strong>Ghi chú:</strong> ${escapeHtml(data.note)}</p>` : ''}`;

  const html = renderEmail({
    title: `Đơn hàng ${data.order_code}`,
    heading,
    bodyHtml,
    ctaLabel: isVnpay ? 'Hoàn tất thanh toán' : 'Xem chi tiết đơn hàng',
    ctaUrl: `${frontendOrigin()}/orders/${data.order_code}`,
  });

  const subject = isVnpay
    ? `[BookStore] Đơn hàng ${data.order_code} — vui lòng hoàn tất thanh toán`
    : `[BookStore] Xác nhận đơn hàng ${data.order_code}`;
  return { subject, html };
}

// Nạp đơn theo mã + gửi email xác nhận. FAIL-SOFT hoàn toàn: mọi lỗi (kể cả lỗi nạp
// DB) được nuốt + log, KHÔNG bao giờ ném ra ngoài. Vì vậy controller gọi kiểu
// fire-and-forget (không await) cũng không gây unhandled rejection.
export async function sendOrderConfirmationEmail(orderCode: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { order_code: orderCode },
      include: {
        items: { orderBy: { id: 'asc' } },
        payments: { orderBy: { id: 'asc' } },
        user: { select: { email: true, name: true } },
      },
    });
    if (!order) return;

    const { subject, html } = buildOrderConfirmationEmail({
      order_code: order.order_code,
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      total: order.total,
      note: order.note,
      payment_method: order.payments[0]?.gateway ?? 'cod',
      shipping_recipient_name: order.shipping_recipient_name,
      shipping_phone: order.shipping_phone,
      shipping_province_name: order.shipping_province_name,
      shipping_ward_name: order.shipping_ward_name,
      shipping_street: order.shipping_street,
      customer_name: order.user.name,
      items: order.items.map((it) => ({
        book_title: it.book_title,
        book_author_name: it.book_author_name,
        price_at_order: it.price_at_order,
        quantity: it.quantity,
      })),
    });

    await sendMailSafe({ to: order.user.email, subject, html });
  } catch (err) {
    logger.error('Không gửi được email xác nhận đơn (đã bỏ qua, không ảnh hưởng đặt hàng)', { err });
  }
}
