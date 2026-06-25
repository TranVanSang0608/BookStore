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

// ---------- Admin: quản lý phí ship theo tỉnh ----------

// Danh sách phí ship 34 tỉnh kèm TÊN tỉnh để admin dễ tra. ShippingZone không có FK tới
// Province (chỉ lưu province_code) nên nạp Province riêng rồi ghép tên. Sắp theo tên tỉnh.
export async function listShippingZones() {
  const [zones, provinces] = await Promise.all([
    prisma.shippingZone.findMany(),
    prisma.province.findMany(),
  ]);
  const nameByCode = new Map(provinces.map((p) => [p.code, p.name]));

  return zones
    .map((z) => ({
      province_code: z.province_code,
      province_name: nameByCode.get(z.province_code) ?? z.province_code,
      fee: z.fee,
      free_threshold: z.free_threshold,
    }))
    .sort((a, b) => a.province_name.localeCompare(b.province_name, 'vi'));
}

// Sửa phí + ngưỡng free ship của 1 tỉnh. Không tồn tại → 404 (không tạo mới tỉnh lạ).
export async function updateShippingZone(
  provinceCode: string,
  data: { fee: number; free_threshold: number | null },
) {
  const zone = await prisma.shippingZone.findUnique({ where: { province_code: provinceCode } });
  if (!zone) throw new AppError(404, 'Không tìm thấy khu vực giao hàng này');

  return prisma.shippingZone.update({
    where: { province_code: provinceCode },
    data: { fee: data.fee, free_threshold: data.free_threshold },
  });
}
