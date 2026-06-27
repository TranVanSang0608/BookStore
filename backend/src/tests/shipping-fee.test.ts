import { calcDistanceFee, type DistanceFeeConfig } from '../lib/shipping-fee';

// Cấu hình mẫu: base 15k cho 3km đầu, 5k/km vượt, miễn phí đơn >= 300k, trần 60k
const config: DistanceFeeConfig = {
  base_fee: 15_000,
  per_km_fee: 5_000,
  free_km: 3,
  free_threshold: 300_000,
  max_fee: 60_000,
};

describe('calcDistanceFee', () => {
  it('trong free_km → chỉ tính base_fee', () => {
    expect(calcDistanceFee(2.5, 100_000, config)).toBe(15_000);
    expect(calcDistanceFee(3, 100_000, config)).toBe(15_000);
  });

  it('vượt free_km → base + km vượt × phí/km (làm tròn LÊN từng km)', () => {
    // 5.2km - 3km = 2.2 → ceil = 3 km vượt → 15k + 3×5k = 30k
    expect(calcDistanceFee(5.2, 100_000, config)).toBe(30_000);
    // đúng 5km → 2km vượt → 15k + 10k = 25k
    expect(calcDistanceFee(5, 100_000, config)).toBe(25_000);
  });

  it('đơn đạt ngưỡng free_threshold → miễn phí (0) dù xa', () => {
    expect(calcDistanceFee(20, 300_000, config)).toBe(0);
    expect(calcDistanceFee(20, 350_000, config)).toBe(0);
  });

  it('chặn trần max_fee', () => {
    // 100km rất xa → vượt trần → bằng đúng 60k
    expect(calcDistanceFee(100, 100_000, config)).toBe(60_000);
  });

  it('free_threshold null → không bao giờ miễn phí theo đơn', () => {
    const noFree = { ...config, free_threshold: null };
    expect(calcDistanceFee(2, 999_000, noFree)).toBe(15_000);
  });

  it('max_fee null → không chặn trần', () => {
    const noCap = { ...config, max_fee: null };
    // 23km → 20km vượt → 15k + 20×5k = 115k
    expect(calcDistanceFee(23, 100_000, noCap)).toBe(115_000);
  });
});
