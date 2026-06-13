// Unit test cho shipping service — THIET-KE.md mục 7 yêu cầu test riêng cho ship calc.
// Hàm này Phase 4 createOrder sẽ tái dùng nguyên trạng nên test kỹ các biên.
import { prisma } from '../lib/prisma';
import { calcShippingFee } from '../modules/shipping/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    shippingZone: {
      findUnique: jest.fn(),
    },
  },
}));

const mockZoneFindUnique = prisma.shippingZone.findUnique as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// Zone mẫu: phí 20k, free ship từ 300k (như seed nội thành lớn)
const zoneHaNoi = { id: 1, province_code: '01', fee: 20000, free_threshold: 300000 };

describe('calcShippingFee', () => {
  it('dưới ngưỡng freeship → tính phí đầy đủ', async () => {
    mockZoneFindUnique.mockResolvedValue(zoneHaNoi);

    const result = await calcShippingFee('01', 100000);

    expect(result).toEqual({
      shipping_fee: 20000,
      free_shipping_applied: false,
      free_threshold: 300000,
    });
  });

  it('ĐÚNG BẰNG ngưỡng → được freeship (điều kiện là >=, không phải >)', async () => {
    mockZoneFindUnique.mockResolvedValue(zoneHaNoi);

    const result = await calcShippingFee('01', 300000);

    expect(result.shipping_fee).toBe(0);
    expect(result.free_shipping_applied).toBe(true);
  });

  it('vượt ngưỡng → freeship', async () => {
    mockZoneFindUnique.mockResolvedValue(zoneHaNoi);

    const result = await calcShippingFee('01', 1000000);

    expect(result.shipping_fee).toBe(0);
  });

  it('free_threshold null = tỉnh không áp dụng freeship → luôn tính phí dù đơn to', async () => {
    mockZoneFindUnique.mockResolvedValue({ ...zoneHaNoi, fee: 35000, free_threshold: null });

    const result = await calcShippingFee('01', 99999999);

    expect(result.shipping_fee).toBe(35000);
    expect(result.free_shipping_applied).toBe(false);
  });

  it('mã tỉnh không có zone → 400 (không đoán phí bừa)', async () => {
    mockZoneFindUnique.mockResolvedValue(null);

    await expect(calcShippingFee('99', 100000)).rejects.toMatchObject({ statusCode: 400 });
  });
});
