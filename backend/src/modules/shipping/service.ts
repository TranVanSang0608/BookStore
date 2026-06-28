import { haversineKm } from '../../lib/geo';
import { prisma } from '../../lib/prisma';
import { PROVINCE_COORDS } from '../../lib/province-coords';
import { calcDistanceFee } from '../../lib/shipping-fee';
import { AppError } from '../../middleware/error';

// Đọc cấu hình phí-theo-khoảng-cách (singleton id=1). Null = chưa cấu hình → dùng zone cũ.
export function getShippingConfig() {
  return prisma.shippingConfig.findUnique({ where: { id: 1 } });
}

// Tính phí ship — NGUỒN SỰ THẬT DUY NHẤT (D40): checkout preview (`/shipping/fee`) + createOrder
// đều gọi hàm này, FE không bao giờ tự tính (client sửa được).
//
// 2 CHẾ ĐỘ (D62):
//  - KHOẢNG CÁCH: ShippingConfig.enabled + tỉnh đã có distance_km → phí theo km (calcDistanceFee),
//    ngưỡng free dùng GLOBAL ShippingConfig.free_threshold.
//  - FALLBACK (tắt / thiếu distance_km / chưa cấu hình): phí cố định zone.fee, ngưỡng free dùng
//    ShippingZone.free_threshold cũ. → checkout không bao giờ vỡ.
//
// ⚠️ subtotal ở endpoint preview đến TỪ CLIENT (chỉ để hiển thị); createOrder TỰ tính subtotal
// từ giỏ DB rồi truyền vào — không tin số client gửi.
export async function calcShippingFee(provinceCode: string, subtotal: number) {
  const [zone, config] = await Promise.all([
    prisma.shippingZone.findUnique({ where: { province_code: provinceCode } }),
    getShippingConfig(),
  ]);
  if (!zone) throw new AppError(400, 'Chưa hỗ trợ giao hàng tới khu vực này');

  // --- Chế độ KHOẢNG CÁCH ---
  if (config?.enabled && zone.distance_km != null) {
    const shipping_fee = calcDistanceFee(zone.distance_km, subtotal, {
      base_fee: config.base_fee,
      per_km_fee: config.per_km_fee,
      free_km: config.free_km,
      free_threshold: config.free_threshold, // GLOBAL
      max_fee: config.max_fee,
    });
    return {
      shipping_fee,
      free_shipping_applied: shipping_fee === 0,
      free_threshold: config.free_threshold,
      distance_km: zone.distance_km,
    };
  }

  // --- FALLBACK: zone cố định (giữ nguyên hành vi cũ) ---
  const freeShipping = zone.free_threshold !== null && subtotal >= zone.free_threshold;
  return {
    shipping_fee: freeShipping ? 0 : zone.fee,
    free_shipping_applied: freeShipping,
    free_threshold: zone.free_threshold,
    distance_km: null as number | null,
  };
}

// Tính lại distance_km cho 34 tỉnh từ vị trí kho (gọi khi admin đổi kho/road_factor).
// distance_km = haversine(kho, tâm tỉnh) × road_factor, làm tròn 0.1km. Tỉnh thiếu tọa độ → bỏ qua
// (distance_km giữ null → rơi fallback).
export async function recomputeZoneDistances() {
  const config = await getShippingConfig();
  if (!config) throw new AppError(400, 'Chưa cấu hình kho và công thức phí ship');

  const zones = await prisma.shippingZone.findMany();
  let updated = 0;
  for (const zone of zones) {
    const coord = PROVINCE_COORDS[zone.province_code];
    if (!coord) continue;
    const straight = haversineKm(config.warehouse_lat, config.warehouse_lng, coord.lat, coord.lng);
    const distance_km = Math.round(straight * config.road_factor * 10) / 10;
    await prisma.shippingZone.update({ where: { id: zone.id }, data: { distance_km } });
    updated++;
  }
  return { updated };
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
      distance_km: z.distance_km, // null nếu chưa tính (D62)
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
