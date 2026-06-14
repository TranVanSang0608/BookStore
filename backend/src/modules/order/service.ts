import type { OrderStatus, Prisma } from '../../generated/prisma/client';
import { generateOrderCode, generateTxnRef } from '../../lib/order-code';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { getCart } from '../cart/service';
import { calcShippingFee } from '../shipping/service';
import type { CreateOrderInput, ListOrdersQuery } from './schemas';

// ---------- State machine (D42) ----------
// Luồng tiến của đơn: Pending → Confirmed → Shipping → Delivered.
// Map "bước kế tiếp hợp lệ" — admin chỉ được tiến ĐÚNG 1 BƯỚC, không nhảy/không lùi.
// Delivered & Cancelled không có bước kế → là trạng thái cuối (terminal).
// Dùng string literal (không import enum runtime — xem schemas.ts) cho khớp giá trị DB.
const ADMIN_NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  Pending: 'Confirmed',
  Confirmed: 'Shipping',
  Shipping: 'Delivered',
};

// Đơn ở Prisma P2002 = vi phạm unique. Mã đơn là cột @unique duy nhất ta tạo
// (Payment.txn_ref để null), nên P2002 ở đây chắc chắn là trùng order_code → sinh mã mới retry.
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002';
}

// Include dùng chung cho trang chi tiết đơn: các dòng hàng (snapshot) + payment
const orderDetailInclude = {
  items: { orderBy: { id: 'asc' } },
  payments: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;

// ---------- Tạo đơn (transaction — THIET-KE.md mục 5.3) ----------

export async function createOrder(userId: number, input: CreateOrderInput) {
  // --- VALIDATE TRƯỚC transaction: fail nhanh + báo lỗi thân thiện (chưa đụng tới DB ghi) ---
  const cart = await getCart(userId);
  if (cart.items.length === 0) throw new AppError(400, 'Giỏ hàng đang trống');

  // Mọi sách trong giỏ phải còn bán + đủ tồn mới được đặt (khác trang giỏ: ở đó chỉ cảnh báo)
  for (const item of cart.items) {
    if (!item.book.is_active) throw new AppError(400, `Sách "${item.book.title}" không còn bán`);
    if (item.quantity > item.book.stock_quantity) {
      throw new AppError(400, `Sách "${item.book.title}" chỉ còn ${item.book.stock_quantity} cuốn`);
    }
  }

  // Địa chỉ phải thuộc về user đang đặt (findFirst kèm user_id — chống đặt hộ địa chỉ người khác)
  const address = await prisma.address.findFirst({ where: { id: input.address_id, user_id: userId } });
  if (!address) throw new AppError(404, 'Không tìm thấy địa chỉ giao hàng');

  // Tiền tính HOÀN TOÀN ở server (D40): subtotal từ giá DB, ship từ calcShippingFee — không tin client
  const subtotal = cart.items.reduce((sum, item) => sum + item.book.price * item.quantity, 0);
  const { shipping_fee } = await calcShippingFee(address.province_code, subtotal);
  const total = subtotal + shipping_fee;

  // --- Retry quanh CẢ transaction: trùng mã đơn (P2002) → sinh mã mới, chạy lại.
  // Lỗi khác (vd oversell 409) KHÔNG retry — ném ra ngoài luôn. ---
  for (let attempt = 0; ; attempt++) {
    const orderCode = generateOrderCode();
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Tạo Order — snapshot địa chỉ (KHÔNG FK về Address: user xóa địa chỉ sau này
        //    thì đơn cũ vẫn đọc đúng nơi giao lúc đặt — SNAPSHOT principle)
        const order = await tx.order.create({
          data: {
            order_code: orderCode,
            user_id: userId,
            subtotal,
            shipping_fee,
            total,
            note: input.note,
            shipping_recipient_name: address.recipient_name,
            shipping_phone: address.phone,
            shipping_province_name: address.province_name,
            shipping_ward_name: address.ward_name,
            shipping_street: address.street_detail,
          },
        });

        // 2. Snapshot từng dòng hàng — lưu title/tác giả/giá/bìa TẠI THỜI ĐIỂM ĐẶT.
        //    Sau này sách đổi giá/đổi tên hay bị xóa, lịch sử đơn vẫn nguyên vẹn.
        await tx.orderItem.createMany({
          data: cart.items.map((item) => ({
            order_id: order.id,
            book_id: item.book_id,
            book_title: item.book.title,
            book_author_name: item.book.author.name,
            price_at_order: item.book.price,
            cover_image_url_snapshot: item.book.cover_image_url,
            quantity: item.quantity,
          })),
        });

        // 3. Trừ kho ATOMIC chống oversell (D45): điều kiện stock_quantity >= qty nằm NGAY
        //    trong câu UPDATE. 2 đơn mua cuốn cuối cùng chạy song song → chỉ 1 câu update
        //    khớp (count=1), câu kia count=0 → ta throw → transaction rollback. Không bao giờ âm kho.
        for (const item of cart.items) {
          const result = await tx.book.updateMany({
            where: { id: item.book_id!, is_active: true, stock_quantity: { gte: item.quantity } },
            data: { stock_quantity: { decrement: item.quantity } },
          });
          if (result.count !== 1) {
            throw new AppError(409, `Sách "${item.book.title}" vừa hết hàng, vui lòng thử lại`);
          }
        }

        // 4. Tạo Payment trạng thái Pending theo phương thức đã chọn:
        //    - cod  : tiền thu khi giao → lật Paid ở bước admin Delivered (D43).
        //    - vnpay: kèm txn_ref để đối soát callback; lật Paid khi VNPay báo thành công (Phase 5).
        //    Order.status vẫn Pending trong cả 2 case — payment status ≠ order status (D46).
        await tx.payment.create({
          data: {
            order_id: order.id,
            gateway: input.payment_method,
            amount: total,
            status: 'Pending',
            txn_ref: input.payment_method === 'vnpay' ? generateTxnRef(orderCode) : null,
          },
        });

        // 5. Dọn giỏ + CHỐT đơn atomic (optimistic concurrency trên giỏ).
        //    Xóa từng dòng theo ĐÚNG (book_id + quantity) đã đọc lúc đầu — KHÔNG xóa cả giỏ.
        //    Đơn chỉ commit nếu MỌI dòng giỏ vẫn y nguyên như lúc dựng snapshot:
        //    - Tab khác đổi số lượng / thêm cùng cuốn (qty tăng) → điều kiện quantity không khớp
        //      → dòng đó không xóa được → count thiếu → throw 409 → rollback (đơn snapshot cũ bị hủy,
        //      thay đổi của tab kia được giữ nguyên).
        //    - Double-submit cùng giỏ → request thua thấy dòng đã bị xóa → count thiếu → 409.
        //    - Sách user thêm MỚI (book_id khác) ở tab khác không nằm trong vòng lặp → còn nguyên.
        let deletedCount = 0;
        for (const item of cart.items) {
          const d = await tx.cartItem.deleteMany({
            where: { cart: { user_id: userId }, book_id: item.book_id!, quantity: item.quantity },
          });
          deletedCount += d.count;
        }
        if (deletedCount !== cart.items.length) {
          throw new AppError(409, 'Giỏ hàng vừa thay đổi, vui lòng thử lại');
        }

        // Trả chi tiết đầy đủ (kèm items + payments) — đúng kiểu OrderDetail mà FE khai báo
        return tx.order.findUnique({ where: { id: order.id }, include: orderDetailInclude });
      });
    } catch (error) {
      // Trùng mã đơn (cực hiếm) → thử lại tối đa 5 lần với mã mới; quá thì chịu thua, ném lỗi
      if (isUniqueViolation(error) && attempt < 4) continue;
      throw error;
    }
  }
}

// ---------- Hủy đơn (transaction) — dùng chung cho user / admin / cron ----------

// allowedFrom = các trạng thái ĐƯỢC PHÉP hủy, do caller TRUYỀN (invariant quyền nằm
// TRONG transaction, không phụ thuộc check ngoài có thể bị race):
//   - user & cron: ['Pending']   - admin: ['Pending','Confirmed']
// Default ['Pending'] cố tình CHẶT NHẤT (fail-closed): caller quên truyền cũng không lỡ
// cho hủy đơn đã Confirmed. Shipping/Delivered không bao giờ nằm trong allowedFrom.
export async function cancelOrder(orderId: number, allowedFrom: OrderStatus[] = ['Pending']) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');

    // Idempotent: đã hủy rồi → trả về luôn, KHÔNG hoàn kho lần 2
    if (order.status === 'Cancelled') {
      return tx.order.findUnique({ where: { id: orderId }, include: orderDetailInclude });
    }
    // Đơn đã thu tiền (VNPay Paid) thì KHÔNG cho tự hủy: hủy sẽ hoàn kho nhưng tiền đã thu,
    // refund nằm ngoài scope đồ án (NICE). Chặn ở đây để cron/user/admin đều không lách được.
    if (order.payments.some((p) => p.status === 'Paid')) {
      throw new AppError(400, 'Đơn đã thanh toán, không thể hủy (cần hoàn tiền — ngoài phạm vi đồ án)');
    }
    if (!allowedFrom.includes(order.status)) {
      throw new AppError(400, 'Không thể hủy đơn ở trạng thái hiện tại');
    }

    // CHỐT atomic: chỉ chuyển sang Cancelled NẾU status vẫn ĐÚNG như vừa đọc.
    const claim = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: 'Cancelled', cancelled_at: new Date() },
    });
    if (claim.count !== 1) {
      // Có request khác vừa đổi status giữa lúc ta đọc và update. Phân biệt 2 ca:
      // - status giờ là Cancelled (request hủy khác thắng) → idempotent noop, trả 200.
      // - status đổi sang khác (vd admin vừa Confirmed) → KHÔNG được báo "hủy thành công"
      //   mà phải 409, để FE biết đơn chưa bị hủy và tải lại.
      const fresh = await tx.order.findUnique({ where: { id: orderId }, include: orderDetailInclude });
      if (fresh?.status === 'Cancelled') return fresh;
      throw new AppError(409, 'Trạng thái đơn vừa thay đổi, vui lòng tải lại trang');
    }

    // Chỉ "người thắng" mới hoàn kho — từng dòng còn trỏ tới sách (book_id != null;
    // sách bị xóa thì book_id đã null nhờ onDelete SetNull, không có gì để hoàn)
    for (const item of order.items) {
      if (item.book_id !== null) {
        await tx.book.update({
          where: { id: item.book_id },
          data: { stock_quantity: { increment: item.quantity } },
        });
      }
    }

    // Hủy Payment đang chờ (giữ nguyên Payment đã Paid để còn dấu vết tiền đã thu)
    await tx.payment.updateMany({
      where: { order_id: orderId, status: 'Pending' },
      data: { status: 'Cancelled' },
    });

    return tx.order.findUnique({ where: { id: orderId }, include: orderDetailInclude });
  });
}

// ---------- Đọc đơn (user) ----------

export async function getOrderByCode(userId: number, code: string) {
  // findFirst kèm user_id: đơn của người khác coi như không tồn tại (404, không lộ)
  const order = await prisma.order.findFirst({
    where: { order_code: code, user_id: userId },
    include: orderDetailInclude,
  });
  if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
  return order;
}

export async function getUserOrders(userId: number, query: ListOrdersQuery) {
  const where: Prisma.OrderWhereInput = { user_id: userId };
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placed_at: 'desc' }, // đơn mới nhất lên đầu
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      // Đủ field cho 1 dòng trong danh sách đơn; chi tiết đầy đủ xem ở getOrderByCode
      select: {
        order_code: true,
        status: true,
        total: true,
        placed_at: true,
        items: { select: { book_title: true, quantity: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
}

// ---------- Phần admin ----------

export async function adminListOrders(query: ListOrdersQuery) {
  const where: Prisma.OrderWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.q) where.order_code = { contains: query.q, mode: 'insensitive' }; // tìm theo mã đơn

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placed_at: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        order_code: true,
        status: true,
        total: true,
        placed_at: true,
        user: { select: { name: true, email: true } }, // admin cần biết đơn của ai
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
}

export async function getOrderById(id: number) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { ...orderDetailInclude, user: { select: { name: true, email: true } } },
  });
  if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
  return order;
}

// Admin đổi trạng thái đơn (D42). Hai nhánh:
// - Hủy: ủy quyền cho cancelOrder (hoàn kho) — chỉ khi đơn còn hủy được.
// - Tiến bước: phải ĐÚNG bước kế tiếp; riêng Delivered thì thu tiền COD (Payment → Paid).
export async function adminUpdateStatus(id: number, target: OrderStatus) {
  // Hủy: ủy quyền cancelOrder (đã guard atomic + hoàn kho). Admin hủy được từ Pending|Confirmed.
  if (target === 'Cancelled') {
    return cancelOrder(id, ['Pending', 'Confirmed']);
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: orderDetailInclude });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');

    // Phải tiến ĐÚNG 1 bước theo state machine (không nhảy/không lùi)
    if (ADMIN_NEXT_STATUS[order.status] !== target) {
      throw new AppError(400, `Không thể chuyển đơn từ "${order.status}" sang "${target}"`);
    }

    // Đơn VNPay PHẢI thanh toán xong mới được xác nhận/giao (tiền thu trước khi giao).
    // COD thì thu khi giao nên không chặn (đơn COD không có Payment gateway vnpay).
    const isVnpay = order.payments.some((p) => p.gateway === 'vnpay');
    const isPaid = order.payments.some((p) => p.status === 'Paid');
    if (isVnpay && !isPaid) {
      throw new AppError(400, 'Đơn VNPay chưa thanh toán — không thể xác nhận/giao');
    }

    // CHỐT atomic: chỉ tiến NẾU status vẫn y như vừa đọc. Nếu cron/user vừa Cancelled xen
    // vào giữa lúc admin bấm → count=0 → 409, KHÔNG "hồi sinh" đơn đã hủy sang trạng thái khác.
    const claim = await tx.order.updateMany({
      where: { id, status: order.status },
      data: { status: target },
    });
    if (claim.count !== 1) {
      throw new AppError(409, 'Trạng thái đơn vừa thay đổi, vui lòng tải lại trang');
    }

    // Giao thành công = thu tiền mặt COD → đánh dấu Payment đã thanh toán
    if (target === 'Delivered') {
      await tx.payment.updateMany({
        where: { order_id: id, gateway: 'cod', status: 'Pending' },
        data: { status: 'Paid', paid_at: new Date() },
      });
    }

    return tx.order.findUnique({ where: { id }, include: orderDetailInclude });
  });
}
