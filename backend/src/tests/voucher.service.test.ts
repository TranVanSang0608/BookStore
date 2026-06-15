// Unit test cho validateVoucher + previewVoucher — mock prisma + getCart.
import { prisma } from '../lib/prisma';
import { getCart } from '../modules/cart/service';
import { previewVoucher, validateVoucher } from '../modules/voucher/service';

jest.mock('../lib/prisma', () => ({
  prisma: { voucher: { findUnique: jest.fn() }, voucherUsage: { count: jest.fn() } },
}));
jest.mock('../modules/cart/service', () => ({ getCart: jest.fn() }));

const findUnique = prisma.voucher.findUnique as jest.Mock;
const count = prisma.voucherUsage.count as jest.Mock;
const mockGetCart = getCart as jest.Mock;

// Voucher mẫu HỢP LỆ; override field để dựng từng ca lỗi
function makeVoucher(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    code: 'SALE20K',
    discount_type: 'fixed',
    discount_value: 20_000,
    min_order: 100_000,
    max_discount: null,
    expire_at: null,
    usage_limit: 100,
    used_count: 0,
    per_user_limit: 1,
    is_active: true,
    ...over,
  };
}

const ok = { code: 'SALE20K', userId: 5, subtotal: 200_000 };

beforeEach(() => {
  jest.clearAllMocks();
  count.mockResolvedValue(0); // mặc định user chưa dùng mã lần nào
});

describe('validateVoucher', () => {
  it('hợp lệ → trả discount đúng', async () => {
    findUnique.mockResolvedValue(makeVoucher());
    const res = await validateVoucher(ok);
    expect(res.discount).toBe(20_000);
    expect(res.voucher.code).toBe('SALE20K');
  });

  it('không tồn tại → 400', async () => {
    findUnique.mockResolvedValue(null);
    await expect(validateVoucher(ok)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('đã tắt (is_active false) → 400', async () => {
    findUnique.mockResolvedValue(makeVoucher({ is_active: false }));
    await expect(validateVoucher(ok)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('hết hạn → 400', async () => {
    findUnique.mockResolvedValue(makeVoucher({ expire_at: new Date(Date.now() - 1000) }));
    await expect(validateVoucher(ok)).rejects.toThrow(/hết hạn/);
  });

  it('chưa đạt đơn tối thiểu → 400', async () => {
    findUnique.mockResolvedValue(makeVoucher({ min_order: 500_000 }));
    await expect(validateVoucher(ok)).rejects.toThrow(/tối thiểu/);
  });

  it('hết lượt tổng (used_count >= usage_limit) → 400', async () => {
    findUnique.mockResolvedValue(makeVoucher({ usage_limit: 10, used_count: 10 }));
    await expect(validateVoucher(ok)).rejects.toThrow(/hết lượt/);
  });

  it('vượt per_user_limit → 400', async () => {
    findUnique.mockResolvedValue(makeVoucher({ per_user_limit: 1 }));
    count.mockResolvedValue(1);
    await expect(validateVoucher(ok)).rejects.toThrow(/đã dùng mã này/);
  });

  it('chuẩn hóa mã: nhập "  sale20k " → tra "SALE20K"', async () => {
    findUnique.mockResolvedValue(makeVoucher());
    await validateVoucher({ ...ok, code: '  sale20k ' });
    expect(findUnique).toHaveBeenCalledWith({ where: { code: 'SALE20K' } });
  });

  it('usage_limit null (không giới hạn tổng) vẫn qua dù used_count cao', async () => {
    findUnique.mockResolvedValue(makeVoucher({ usage_limit: null, used_count: 9999 }));
    const res = await validateVoucher(ok);
    expect(res.discount).toBe(20_000);
  });
});

describe('previewVoucher (lấy subtotal từ giỏ DB)', () => {
  it('giỏ rỗng (subtotal <= 0) → 400', async () => {
    mockGetCart.mockResolvedValue({ items: [], subtotal: 0 });
    await expect(previewVoucher(5, 'SALE20K')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('giỏ có hàng → trả đúng shape {code, discount_type, discount_value, discount}', async () => {
    mockGetCart.mockResolvedValue({ items: [{}], subtotal: 200_000 });
    findUnique.mockResolvedValue(makeVoucher());
    const res = await previewVoucher(5, 'sale20k');
    expect(res).toEqual({
      code: 'SALE20K',
      discount_type: 'fixed',
      discount_value: 20_000,
      discount: 20_000,
    });
  });
});
