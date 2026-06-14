// Unit test cho generateOrderCode — hàm thuần, test thẳng không cần mock
import { generateOrderCode } from '../lib/order-code';

describe('generateOrderCode', () => {
  it('đúng định dạng BK-YYYYMMDD-XXXXX', () => {
    const code = generateOrderCode(new Date('2026-06-13T10:00:00'));
    expect(code).toMatch(/^BK-20260613-[2-9A-HJ-NP-Z]{5}$/);
  });

  it('không chứa ký tự dễ nhầm 0 O 1 I L', () => {
    // Sinh nhiều mã, gom toàn bộ phần hậu tố, kiểm tra không lọt ký tự cấm
    const suffixes = Array.from({ length: 200 }, () => generateOrderCode().split('-')[2]).join('');
    expect(suffixes).not.toMatch(/[0O1IL]/);
  });

  it('mã sinh ra hầu như không trùng (random đủ rộng)', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateOrderCode()));
    // 31^5 ~ 28 triệu tổ hợp/ngày → 500 mã trùng là gần như không thể
    expect(codes.size).toBe(500);
  });
});
