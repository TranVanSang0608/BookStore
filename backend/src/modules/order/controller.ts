import { Request, Response } from 'express';
import { getClientIp } from '../../lib/client-ip';
import { parseId } from '../../lib/parse-id';
import { assertVnpayConfigured } from '../../lib/vnpay';
import { AppError } from '../../middleware/error';
import { sendOrderConfirmationEmail } from '../notification/order-email';
import * as paymentService from '../payment/service';
import { listOrdersQuerySchema } from './schemas';
import * as orderService from './service';

// ---------- User ----------

export async function create(req: Request, res: Response) {
  // Chọn VNPay mà server thiếu cấu hình → fail SỚM (trước khi tạo đơn): tránh tạo đơn dở
  // (đã trừ kho, dọn giỏ) rồi mới lỗi lúc build URL.
  if (req.body.payment_method === 'vnpay') assertVnpayConfigured();

  const order = await orderService.createOrder(req.user!.id, req.body);

  // Gửi email xác nhận đơn — fire-and-forget (KHÔNG await): email là phụ trợ, fail-soft
  // bên trong nên lỗi gửi mail không bao giờ làm hỏng việc đặt hàng / chậm response.
  if (order) void sendOrderConfirmationEmail(order.order_code);

  // Đơn VNPay: dựng luôn URL thanh toán để FE redirect thẳng sang cổng VNPay
  // (tái dùng Payment vnpay Pending mà createOrder vừa tạo). COD thì chỉ trả order.
  if (order?.payments[0]?.gateway === 'vnpay') {
    const { payment_url } = await paymentService.startVnpayPayment(
      req.user!.id,
      order.order_code,
      getClientIp(req),
    );
    res.status(201).json({ success: true, data: { ...order, payment_url } });
    return;
  }

  res.status(201).json({ success: true, data: order });
}

export async function list(req: Request, res: Response) {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await orderService.getUserOrders(req.user!.id, query);
  res.json({ success: true, data: result });
}

export async function detail(req: Request, res: Response) {
  const order = await orderService.getOrderByCode(req.user!.id, String(req.params.code));
  res.json({ success: true, data: order });
}

export async function cancel(req: Request, res: Response) {
  // getOrderByCode đã chặn ownership (404 nếu không phải đơn của user này)
  const order = await orderService.getOrderByCode(req.user!.id, String(req.params.code));
  // User chỉ được hủy đơn CỦA MÌNH khi còn Pending (check sớm cho thông báo thân thiện;
  // invariant THẬT do cancelOrder enforce atomic với allowedFrom ['Pending'] — D42)
  if (order.status !== 'Pending') {
    throw new AppError(400, 'Chỉ có thể hủy đơn khi đang chờ xác nhận');
  }
  const updated = await orderService.cancelOrder(order.id, ['Pending']);
  res.json({ success: true, data: updated });
}

// ---------- Admin ----------

export async function adminList(req: Request, res: Response) {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await orderService.adminListOrders(query);
  res.json({ success: true, data: result });
}

export async function adminDetail(req: Request, res: Response) {
  const order = await orderService.getOrderById(parseId(req.params.id));
  res.json({ success: true, data: order });
}

export async function adminUpdateStatus(req: Request, res: Response) {
  const order = await orderService.adminUpdateStatus(parseId(req.params.id), req.body.status);
  res.json({ success: true, data: order });
}
