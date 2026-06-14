import cron from 'node-cron';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { cancelOrder } from '../modules/order/service';

// Giữ đơn Pending tối đa 24h: quá hạn mà chưa thanh toán/xác nhận thì tự hủy + HOÀN KHO.
// Lý do: stock bị trừ ngay khi tạo đơn (D24) — đơn "ma" treo mãi sẽ giam kho không bán được.
const MAX_PENDING_MS = 24 * 60 * 60 * 1000;

// Export để unit test được câu where (đặc biệt điều kiện bỏ qua đơn đã thanh toán).
export async function cancelStalePendingOrders() {
  const cutoff = new Date(Date.now() - MAX_PENDING_MS);
  const stale = await prisma.order.findMany({
    where: {
      status: 'Pending',
      placed_at: { lt: cutoff }, // @@index([status]) đỡ câu này
      // BỎ QUA đơn VNPay đã trả tiền nhưng Order còn Pending (chờ admin xác nhận):
      // tự hủy sẽ hoàn kho mà KHÔNG hoàn tiền được → tuyệt đối không đụng (D49).
      payments: { none: { status: 'Paid' } },
    },
    select: { id: true, order_code: true },
  });

  if (stale.length === 0) return;

  // Đếm theo kết quả thực thay vì log "thành công" cho từng đơn — vì cancelOrder có thể
  // noop do race (đơn vừa được user hủy / admin xác nhận giữa lúc quét). Không khẳng định
  // sai "cron đã hủy" cho đơn mà nó không thực sự đụng tới.
  let failed = 0;
  for (const order of stale) {
    try {
      // Chỉ cho phép hủy từ Pending; guard atomic trong cancelOrder lo race với user/admin
      await cancelOrder(order.id, ['Pending']);
    } catch (err) {
      failed++;
      logger.error('Auto-hủy đơn lỗi (đơn có thể vừa đổi trạng thái)', { order_code: order.order_code, err });
    }
  }
  logger.info('Cron quét đơn Pending quá 24h', { quet: stale.length, loi: failed });
}

// Chạy mỗi 15 phút. Gọi từ server.ts (KHÔNG ở app.ts) để Jest/Supertest import app
// không vô tình bật cron. server.ts đã chặn thêm khi NODE_ENV=test / DISABLE_CRON=1.
export function startAutoCancelJob() {
  cron.schedule('*/15 * * * *', () => {
    // .catch ở NGOÀI vòng lặp: nếu findMany lỗi (DB rớt...) thì log, không để unhandled rejection
    cancelStalePendingOrders().catch((err) => logger.error('Cron quét đơn lỗi', { err }));
  });
  logger.info('Cron auto-hủy đơn Pending >24h đã bật (mỗi 15 phút)');
}
