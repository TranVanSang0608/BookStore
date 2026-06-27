import { Request, Response } from 'express';
import { getClientIp } from '../../lib/client-ip';
import { logger } from '../../lib/logger';
import { verifyCallback } from '../../lib/vnpay';
import * as paymentService from './service';

const FRONTEND = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

// POST /api/payments/vnpay/create (auth) — trả URL để FE redirect sang trang VNPay
export async function createVnpay(req: Request, res: Response) {
  const result = await paymentService.startVnpayPayment(req.user!.id, req.body.order_code, getClientIp(req));
  res.json({ success: true, data: result });
}

// GET /api/payments/vnpay/return (PUBLIC) — trình duyệt user được VNPay redirect về đây.
// Verify chữ ký + đối soát (idempotent) rồi redirect tiếp về trang chi tiết đơn ở FE
// kèm ?payment=... để FE hiện banner kết quả.
export async function vnpayReturn(req: Request, res: Response) {
  const query = req.query as Record<string, string>;

  // Sai chữ ký = dữ liệu bị giả mạo trên đường truyền → không tin, không cập nhật gì
  const check = verifyCallback(query);
  if (!check.valid) {
    // DEBUG TẠM (xóa sau khi sửa xong): in chữ ký nhận vs tính + chuỗi ký + params để soi chỗ lệch
    logger.warn('[VNPay return] chữ ký KHÔNG khớp', {
      received: check.received,
      expected: check.expected,
      signData: check.signData,
      query,
    });
    res.redirect(`${FRONTEND}/orders?payment=invalid`);
    return;
  }

  const { result, orderCode } = await paymentService.reconcileVnpayPayment(query);
  const payment =
    result === 'success' || result === 'already_paid' ? 'success' : result === 'failed' ? 'failed' : 'invalid';

  res.redirect(orderCode ? `${FRONTEND}/orders/${orderCode}?payment=${payment}` : `${FRONTEND}/orders?payment=invalid`);
}

// GET /api/payments/vnpay/ipn (PUBLIC) — server VNPay gọi thẳng (server→server) để chốt
// kết quả. Đây là NGUỒN SỰ THẬT khi deploy/ngrok. Trả JSON {RspCode, Message} theo spec VNPay.
export async function vnpayIpn(req: Request, res: Response) {
  const query = req.query as Record<string, string>;

  const check = verifyCallback(query);
  if (!check.valid) {
    // DEBUG TẠM (xóa sau khi sửa xong)
    logger.warn('[VNPay IPN] chữ ký KHÔNG khớp', {
      received: check.received,
      expected: check.expected,
      signData: check.signData,
      query,
    });
    res.json({ RspCode: '97', Message: 'Invalid signature' });
    return;
  }

  const { result } = await paymentService.reconcileVnpayPayment(query);
  const map: Record<paymentService.ReconcileResult, { RspCode: string; Message: string }> = {
    success: { RspCode: '00', Message: 'Confirm Success' },
    already_paid: { RspCode: '02', Message: 'Order already confirmed' },
    failed: { RspCode: '00', Message: 'Confirm Success' }, // đã ghi nhận thất bại → vẫn ack cho VNPay
    invalid_amount: { RspCode: '04', Message: 'Invalid amount' },
    not_found: { RspCode: '01', Message: 'Order not found' },
  };
  res.json(map[result]);
}
