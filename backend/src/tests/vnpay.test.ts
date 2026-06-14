// Unit test cho lib/vnpay — hàm thuần (không DB). Khóa thuật toán chữ ký:
// build URL → giả lập callback (parse query như server nhận) → verify khớp;
// sửa tham số (giả mạo) → verify KHÔNG khớp.
import querystring from 'node:querystring';
import { buildPaymentUrl, verifyCallback } from '../lib/vnpay';

beforeAll(() => {
  // Cấu hình VNPay giả cho test — không gọi mạng, chỉ ký/đối chiếu cục bộ
  process.env.VNP_TMN_CODE = 'TESTCODE';
  process.env.VNP_HASH_SECRET = 'SECRETKEY123456';
  process.env.VNP_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  process.env.VNP_RETURN_URL = 'http://localhost:3000/api/payments/vnpay/return';
});

// Tách query string của URL rồi parse như Express nhận callback (decode + và %xx)
function parseCallback(url: string): Record<string, string> {
  return querystring.parse(url.split('?')[1]) as Record<string, string>;
}

describe('buildPaymentUrl', () => {
  it('có đủ tham số bắt buộc và amount được nhân 100', () => {
    const url = buildPaymentUrl({
      txnRef: 'BK20260613ABCDE',
      amount: 240000,
      orderInfo: 'Thanh toan don BK-X',
      ipAddr: '127.0.0.1',
    });
    const q = parseCallback(url);

    expect(url).toContain('vpcpay.html?');
    expect(q.vnp_Amount).toBe('24000000'); // 240.000 × 100
    expect(q.vnp_Command).toBe('pay');
    expect(q.vnp_Version).toBe('2.1.0');
    expect(q.vnp_TxnRef).toBe('BK20260613ABCDE');
    expect(q.vnp_SecureHash).toBeTruthy();
  });
});

describe('verifyCallback', () => {
  it('callback từ chính URL build ra → hợp lệ (build & verify đồng thuật toán)', () => {
    const url = buildPaymentUrl({ txnRef: 'REF1', amount: 100000, orderInfo: 'Thanh toan don BK-Y', ipAddr: '127.0.0.1' });

    expect(verifyCallback(parseCallback(url)).valid).toBe(true);
  });

  it('giả mạo số tiền → chữ ký không khớp (chống sửa amount trên đường truyền)', () => {
    const url = buildPaymentUrl({ txnRef: 'REF2', amount: 100000, orderInfo: 'don test', ipAddr: '127.0.0.1' });
    const q = parseCallback(url);
    q.vnp_Amount = '1'; // hacker hạ số tiền

    expect(verifyCallback(q).valid).toBe(false);
  });

  it('giả mạo mã giao dịch → không khớp', () => {
    const url = buildPaymentUrl({ txnRef: 'REF3', amount: 50000, orderInfo: 'x', ipAddr: '127.0.0.1' });
    const q = parseCallback(url);
    q.vnp_TxnRef = 'REF-HACKED';

    expect(verifyCallback(q).valid).toBe(false);
  });

  it('bỏ qua vnp_SecureHashType khi ký lại (VNPay có thể gửi kèm field này)', () => {
    const url = buildPaymentUrl({ txnRef: 'REF4', amount: 50000, orderInfo: 'x', ipAddr: '127.0.0.1' });
    const q = parseCallback(url);
    q.vnp_SecureHashType = 'SHA512'; // thêm field không nằm trong dữ liệu ký

    expect(verifyCallback(q).valid).toBe(true);
  });
});

describe('cấu hình', () => {
  it('thiếu VNP_HASH_SECRET → throw rõ ràng', () => {
    const saved = process.env.VNP_HASH_SECRET;
    delete process.env.VNP_HASH_SECRET;

    expect(() => buildPaymentUrl({ txnRef: 'R', amount: 1, orderInfo: 'x', ipAddr: '1' })).toThrow(/VNPay/);

    process.env.VNP_HASH_SECRET = saved;
  });
});
