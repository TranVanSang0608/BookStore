import type { Prisma } from '../../generated/prisma/client';
import { generateTxnRef } from '../../lib/order-code';
import { prisma } from '../../lib/prisma';
import { buildPaymentUrl } from '../../lib/vnpay';
import { AppError } from '../../middleware/error';

// ---------- Khởi tạo / thử lại thanh toán VNPay ----------

// Dựng URL thanh toán VNPay cho 1 đơn (dùng cho cả lần đầu ở checkout lẫn "thanh toán lại").
export async function startVnpayPayment(userId: number, orderCode: string, ipAddr: string) {
  const order = await prisma.order.findFirst({
    where: { order_code: orderCode, user_id: userId }, // kèm user_id: chỉ chủ đơn được trả tiền
    include: { payments: true },
  });
  if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
  // Đơn COD đã có Payment cod — KHÔNG cho thanh toán VNPay (tránh 2 phương thức / 2 lần thu tiền)
  if (order.payments.some((p) => p.gateway === 'cod')) {
    throw new AppError(400, 'Đơn này thanh toán khi nhận hàng (COD), không dùng VNPay');
  }
  if (order.status !== 'Pending') throw new AppError(400, 'Đơn không ở trạng thái chờ thanh toán');
  if (order.payments.some((p) => p.status === 'Paid')) throw new AppError(400, 'Đơn đã được thanh toán');

  // Lấy lần thử VNPay đang Pending (vừa tạo ở createOrder); nếu lần trước Failed thì tạo
  // lần thử MỚI — Payment tách bảng để log nhiều lần thử (D26).
  let payment = order.payments.find((p) => p.gateway === 'vnpay' && p.status === 'Pending');
  if (!payment) {
    // KHÓA dòng Order (FOR UPDATE) trong transaction trước khi tạo Payment Pending mới:
    // 2 request "thử lại" song song sẽ nối đuôi nhau, request sau thấy Pending vừa tạo →
    // tái dùng thay vì tạo thêm. Đảm bảo mỗi đơn chỉ có ĐÚNG 1 lần thử Pending tại một thời điểm.
    payment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
      const existing = await tx.payment.findFirst({
        where: { order_id: order.id, gateway: 'vnpay', status: 'Pending' },
      });
      if (existing) return existing;
      return tx.payment.create({
        data: {
          order_id: order.id,
          gateway: 'vnpay',
          amount: order.total,
          status: 'Pending',
          txn_ref: generateTxnRef(order.order_code),
        },
      });
    });
  }

  const payment_url = buildPaymentUrl({
    txnRef: payment.txn_ref!, // payment vnpay luôn có txn_ref (2 đường tạo đều set)
    amount: payment.amount,
    orderInfo: `Thanh toan don ${order.order_code}`,
    ipAddr,
  });

  return { payment_url };
}

// ---------- Đối soát callback (dùng chung Return + IPN) ----------

export type ReconcileResult = 'success' | 'already_paid' | 'failed' | 'invalid_amount' | 'not_found';

// Cập nhật Payment theo kết quả VNPay trả về. Caller ĐÃ verify chữ ký trước khi gọi.
// Tất cả update đều CÓ ĐIỀU KIỆN status:'Pending' → idempotent: Return và IPN gọi chồng
// (hoặc gọi lại) cũng chỉ lật Paid đúng 1 lần (cùng bài học chống race D45).
export async function reconcileVnpayPayment(params: Record<string, string>): Promise<{
  result: ReconcileResult;
  orderCode: string | null;
}> {
  const txnRef = params.vnp_TxnRef;
  const payment = await prisma.payment.findUnique({
    where: { txn_ref: txnRef },
    include: { order: { select: { order_code: true } } },
  });
  if (!payment) return { result: 'not_found', orderCode: null };

  const orderCode = payment.order.order_code;

  // Server TỰ đối chiếu số tiền với DB (×100) — KHÔNG tin amount VNPay/khách khai
  if (Number(params.vnp_Amount) !== payment.amount * 100) {
    return { result: 'invalid_amount', orderCode };
  }

  // Đã Paid rồi → noop (Return + IPN đều gọi; lần sau chỉ xác nhận lại)
  if (payment.status === 'Paid') return { result: 'already_paid', orderCode };

  // VNPay thành công khi cả ResponseCode lẫn TransactionStatus = '00'
  const paidOk = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';

  if (paidOk) {
    const upd = await prisma.payment.updateMany({
      where: { txn_ref: txnRef, status: 'Pending' },
      data: { status: 'Paid', paid_at: new Date(), gateway_response: params as Prisma.InputJsonValue },
    });
    if (upd.count === 1) return { result: 'success', orderCode };

    // count=0: status đã đổi giữa lúc đọc và update (race với callback khác / cancel).
    // Đọc lại để trả ĐÚNG, KHÔNG báo success giả khi DB không hề đổi.
    const fresh = await prisma.payment.findUnique({ where: { txn_ref: txnRef }, select: { status: true } });
    return { result: fresh?.status === 'Paid' ? 'already_paid' : 'failed', orderCode };
  }

  // Thất bại / hủy giữa chừng → đánh dấu Failed (đơn vẫn Pending, user có thể thử lại)
  await prisma.payment.updateMany({
    where: { txn_ref: txnRef, status: 'Pending' },
    data: { status: 'Failed', gateway_response: params as Prisma.InputJsonValue },
  });
  return { result: 'failed', orderCode };
}
