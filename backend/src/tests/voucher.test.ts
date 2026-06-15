// Unit test cho calcDiscount — hàm THUẦN (không DB) nên test thẳng như calcShippingFee.
import { calcDiscount } from '../lib/voucher';

describe('calcDiscount', () => {
  it('percentage: subtotal × value%, làm tròn XUỐNG', () => {
    expect(calcDiscount({ discount_type: 'percentage', discount_value: 10, max_discount: null }, 200_000)).toBe(20_000);
    // 99.999 × 10% = 9999.9 → floor 9999
    expect(calcDiscount({ discount_type: 'percentage', discount_value: 10, max_discount: null }, 99_999)).toBe(9_999);
  });

  it('percentage: chặn trần max_discount', () => {
    // 10% của 1.000.000 = 100k nhưng trần 50k → 50k
    expect(
      calcDiscount({ discount_type: 'percentage', discount_value: 10, max_discount: 50_000 }, 1_000_000),
    ).toBe(50_000);
  });

  it('fixed: trả đúng số tiền cố định', () => {
    expect(calcDiscount({ discount_type: 'fixed', discount_value: 20_000, max_discount: null }, 200_000)).toBe(20_000);
  });

  it('clamp: không bao giờ giảm quá subtotal', () => {
    expect(calcDiscount({ discount_type: 'fixed', discount_value: 500_000, max_discount: null }, 100_000)).toBe(100_000);
  });

  it('không bao giờ âm', () => {
    expect(calcDiscount({ discount_type: 'fixed', discount_value: 0, max_discount: null }, 100_000)).toBe(0);
  });
});
