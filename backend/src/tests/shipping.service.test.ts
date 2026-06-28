// Unit test cho shipping service (D62): 2 chế độ — KHOẢNG CÁCH và FALLBACK (zone cố định).
// calcShippingFee là nguồn sự thật duy nhất (createOrder tái dùng) nên test kỹ cả 2 nhánh.
import { prisma } from '../lib/prisma';
import {
  calcShippingFee,
  getAdminShippingConfig,
  recomputeZoneDistances,
  upsertShippingConfig,
} from '../modules/shipping/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    shippingZone: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    shippingConfig: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

const zoneFind = prisma.shippingZone.findUnique as jest.Mock;
const configFind = prisma.shippingConfig.findUnique as jest.Mock;
const configUpsert = prisma.shippingConfig.upsert as jest.Mock;
const zoneFindMany = prisma.shippingZone.findMany as jest.Mock;
const zoneUpdate = prisma.shippingZone.update as jest.Mock;

beforeEach(() => jest.clearAllMocks());

// Kho TP.HCM; base 15k cho 10km đầu, 80đ/km vượt, free đơn ≥300k, trần 50k
const config = {
  id: 1,
  warehouse_lat: 10.8231,
  warehouse_lng: 106.6297,
  base_fee: 15_000,
  per_km_fee: 80,
  free_km: 10,
  free_threshold: 300_000,
  max_fee: 50_000,
  road_factor: 1.3,
  enabled: true,
};

describe('calcShippingFee — chế độ KHOẢNG CÁCH', () => {
  it('enabled + có distance_km → phí theo km', async () => {
    zoneFind.mockResolvedValue({ province_code: '79', fee: 20_000, free_threshold: 300_000, distance_km: 20 });
    configFind.mockResolvedValue(config);
    const r = await calcShippingFee('79', 100_000);
    expect(r.shipping_fee).toBe(15_800); // 15k + ⌈20-10⌉×80
    expect(r.distance_km).toBe(20);
  });

  it('đơn ≥ free_threshold global → miễn phí dù xa', async () => {
    zoneFind.mockResolvedValue({ province_code: '1', fee: 20_000, free_threshold: null, distance_km: 500 });
    configFind.mockResolvedValue(config);
    const r = await calcShippingFee('1', 300_000);
    expect(r.shipping_fee).toBe(0);
    expect(r.free_shipping_applied).toBe(true);
  });

  it('rất xa → chạm trần max_fee', async () => {
    zoneFind.mockResolvedValue({ province_code: '1', fee: 20_000, free_threshold: null, distance_km: 1500 });
    configFind.mockResolvedValue(config);
    expect((await calcShippingFee('1', 100_000)).shipping_fee).toBe(50_000);
  });
});

describe('calcShippingFee — FALLBACK (zone cố định, giữ hành vi cũ)', () => {
  const zone = { id: 1, province_code: '79', fee: 20_000, free_threshold: 300_000, distance_km: null };

  it('chưa cấu hình (config null) + dưới ngưỡng → phí cố định', async () => {
    zoneFind.mockResolvedValue(zone);
    configFind.mockResolvedValue(null);
    const r = await calcShippingFee('79', 100_000);
    expect(r).toEqual({
      shipping_fee: 20_000,
      free_shipping_applied: false,
      free_threshold: 300_000,
      distance_km: null,
    });
  });

  it('ĐÚNG BẰNG ngưỡng zone → freeship (>=)', async () => {
    zoneFind.mockResolvedValue(zone);
    configFind.mockResolvedValue(null);
    const r = await calcShippingFee('79', 300_000);
    expect(r.shipping_fee).toBe(0);
    expect(r.free_shipping_applied).toBe(true);
  });

  it('config.enabled=false → dùng zone.fee dù đã có distance_km', async () => {
    zoneFind.mockResolvedValue({ ...zone, distance_km: 20 });
    configFind.mockResolvedValue({ ...config, enabled: false });
    const r = await calcShippingFee('79', 100_000);
    expect(r.shipping_fee).toBe(20_000);
    expect(r.distance_km).toBeNull();
  });

  it('enabled nhưng tỉnh chưa có distance_km → zone.fee', async () => {
    zoneFind.mockResolvedValue({ ...zone, fee: 35_000, distance_km: null });
    configFind.mockResolvedValue(config);
    expect((await calcShippingFee('79', 100_000)).shipping_fee).toBe(35_000);
  });

  it('free_threshold null = không freeship → luôn tính phí', async () => {
    zoneFind.mockResolvedValue({ ...zone, fee: 35_000, free_threshold: null });
    configFind.mockResolvedValue(null);
    const r = await calcShippingFee('79', 99_999_999);
    expect(r.shipping_fee).toBe(35_000);
    expect(r.free_shipping_applied).toBe(false);
  });

  it('mã tỉnh không có zone → 400', async () => {
    zoneFind.mockResolvedValue(null);
    configFind.mockResolvedValue(null);
    await expect(calcShippingFee('99', 100_000)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('cấu hình kho (admin)', () => {
  it('getAdminShippingConfig: chưa có config → trả mặc định (enabled=false)', async () => {
    configFind.mockResolvedValue(null);
    const c = await getAdminShippingConfig();
    expect(c.enabled).toBe(false);
    expect(c.warehouse_lat).toBeGreaterThan(0);
    expect(c.max_fee).not.toBeNull(); // mặc định có trần
  });

  it('upsertShippingConfig: lưu config RỒI tính lại distance 34 tỉnh', async () => {
    configUpsert.mockResolvedValue(config); // config đã có id:1
    configFind.mockResolvedValue(config); // recompute đọc lại config
    zoneFindMany.mockResolvedValue([
      { id: 1, province_code: '79' },
      { id: 2, province_code: '1' },
    ]);
    zoneUpdate.mockResolvedValue({});

    const r = await upsertShippingConfig({
      warehouse_lat: 10.8231,
      warehouse_lng: 106.6297,
      base_fee: 15_000,
      per_km_fee: 80,
      free_km: 10,
      free_threshold: 300_000,
      max_fee: 50_000,
      road_factor: 1.3,
      enabled: true,
    });

    expect(configUpsert).toHaveBeenCalledTimes(1);
    expect(r.updated).toBe(2); // recompute chạy sau khi lưu
  });
});

describe('recomputeZoneDistances', () => {
  it('chưa cấu hình → 400', async () => {
    configFind.mockResolvedValue(null);
    await expect(recomputeZoneDistances()).rejects.toMatchObject({ statusCode: 400 });
  });

  it('tính distance_km cho tỉnh có tọa độ, bỏ qua tỉnh lạ', async () => {
    configFind.mockResolvedValue(config); // kho = HCM
    zoneFindMany.mockResolvedValue([
      { id: 1, province_code: '79' }, // HCM ≈ kho → ~0 km
      { id: 2, province_code: '1' }, // Hà Nội → xa
      { id: 3, province_code: 'XX' }, // không có tọa độ → bỏ qua
    ]);
    zoneUpdate.mockResolvedValue({});

    const r = await recomputeZoneDistances();
    expect(r.updated).toBe(2);
    const d79 = zoneUpdate.mock.calls.find((c) => c[0].where.id === 1)![0].data.distance_km;
    const d1 = zoneUpdate.mock.calls.find((c) => c[0].where.id === 2)![0].data.distance_km;
    expect(d79).toBeLessThan(5);
    expect(d1).toBeGreaterThan(1000);
  });
});
