import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';

// Tính phí ship theo zone (bảng config ShippingZone, seed sẵn 34 tỉnh).
// Hàm này là NGUỒN SỰ THẬT DUY NHẤT về phí ship: Phase 3 trang checkout gọi qua API
// để hiển thị, Phase 4 createOrder gọi lại nguyên hàm này phía server khi chốt đơn —
// FE không bao giờ tự tính phí (client có thể bị sửa).
//
// ⚠️ CẢNH BÁO cho Phase 4: `subtotal` ở endpoint /shipping/fee đến TỪ CLIENT nên chỉ
// dùng để HIỂN THỊ preview. Khi createOrder, PHẢI tự tính subtotal từ giỏ trong DB
// (giá sách × số lượng) rồi truyền vào hàm này — KHÔNG bao giờ tin subtotal/phí client gửi.
export async function calcShippingFee(provinceCode: string, subtotal: number) {
  const zone = await prisma.shippingZone.findUnique({
    where: { province_code: provinceCode },
  });
  if (!zone) throw new AppError(400, 'Chưa hỗ trợ giao hàng tới khu vực này');

  // free_threshold null = tỉnh không áp dụng freeship; đơn ĐẠT ngưỡng (>=) là được free
  const freeShipping = zone.free_threshold !== null && subtotal >= zone.free_threshold;

  return {
    shipping_fee: freeShipping ? 0 : zone.fee,
    free_shipping_applied: freeShipping,
    // Trả kèm ngưỡng để FE có thể hiện "mua thêm X để được miễn phí ship" nếu muốn
    free_threshold: zone.free_threshold,
  };
}
