import type { VoucherDiscountType } from '../generated/prisma/client';

// Tính số tiền giảm của voucher. Hàm THUẦN (không DB, không mạng) → unit-test thẳng
// như calcShippingFee/toSlug. Nguồn sự thật tính tiền giảm cho cả preview lẫn createOrder.

// Input tối thiểu để tính — tách type riêng (không cần cả Prisma Voucher) cho dễ test.
export interface DiscountInput {
  discount_type: VoucherDiscountType; // 'percentage' | 'fixed'
  discount_value: number;
  max_discount: number | null;
}

// - percentage: subtotal × value%, LÀM TRÒN XUỐNG, chặn trần max_discount (nếu có).
// - fixed: đúng value đồng.
// Luôn clamp trong [0, subtotal] — không bao giờ giảm quá tạm tính (total không âm,
// và total >= shipping_fee vì discount chỉ trừ phần hàng).
export function calcDiscount(voucher: DiscountInput, subtotal: number): number {
  let discount: number;

  if (voucher.discount_type === 'percentage') {
    discount = Math.floor((subtotal * voucher.discount_value) / 100);
    if (voucher.max_discount != null) discount = Math.min(discount, voucher.max_discount);
  } else {
    discount = voucher.discount_value;
  }

  return Math.max(0, Math.min(discount, subtotal));
}
