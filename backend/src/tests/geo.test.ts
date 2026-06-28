import { haversineKm } from '../lib/geo';

describe('haversineKm', () => {
  it('cùng 1 điểm → 0 km', () => {
    expect(haversineKm(21.0285, 105.8542, 21.0285, 105.8542)).toBeCloseTo(0, 5);
  });

  it('Hà Nội → TP.HCM ~1140 km (đường chim bay)', () => {
    const km = haversineKm(21.0285, 105.8542, 10.8231, 106.6297);
    expect(km).toBeGreaterThan(1100);
    expect(km).toBeLessThan(1180);
  });

  it('Hà Nội → Hải Phòng ~90–110 km', () => {
    const km = haversineKm(21.0285, 105.8542, 20.8449, 106.6881);
    expect(km).toBeGreaterThan(80);
    expect(km).toBeLessThan(120);
  });

  it('đối xứng: A→B = B→A', () => {
    const ab = haversineKm(16.0544, 108.2022, 10.8231, 106.6297);
    const ba = haversineKm(10.8231, 106.6297, 16.0544, 108.2022);
    expect(ab).toBeCloseTo(ba, 6);
  });
});
