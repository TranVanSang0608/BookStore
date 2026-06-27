// Tính phí ship theo KHOẢNG CÁCH (kho → khách). Hàm THUẦN: không gọi API/DB → dễ test và là
// NGUỒN SỰ THẬT DUY NHẤT cho cả preview checkout lẫn createOrder (cùng tinh thần calcShippingFee
// /calcDiscount hiện có). Lấy khoảng cách (km) ở tầng trên (Maps API / haversine) rồi truyền vào đây.

export interface DistanceFeeConfig {
  base_fee: number; // phí cơ bản cho quãng đường trong free_km (VND)
  per_km_fee: number; // phí mỗi km vượt free_km (VND/km)
  free_km: number; // số km đầu đã gồm trong base_fee (không tính thêm)
  free_threshold: number | null; // subtotal >= ngưỡng → miễn phí ship; null = không áp dụng
  max_fee: number | null; // trần phí; null = không chặn trần
}

export function calcDistanceFee(
  distanceKm: number,
  subtotal: number,
  config: DistanceFeeConfig,
): number {
  // Đơn đủ lớn → miễn phí ship (giống ngưỡng free hiện tại)
  if (config.free_threshold !== null && subtotal >= config.free_threshold) return 0;

  // Phí = base + (số km vượt free_km, làm tròn LÊN từng km) × phí/km
  const extraKm = Math.max(0, Math.ceil(distanceKm - config.free_km));
  let fee = config.base_fee + extraKm * config.per_km_fee;

  // Chặn trần nếu cấu hình có
  if (config.max_fee !== null) fee = Math.min(fee, config.max_fee);

  return Math.max(0, Math.round(fee)); // tiền VND nguyên, không âm
}
