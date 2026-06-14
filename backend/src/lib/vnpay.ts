import { createHmac, timingSafeEqual } from 'node:crypto';

// Tích hợp VNPay (cổng thanh toán). Toàn bộ logic chữ ký nằm ở đây — server-side.
// Quy tắc ký BÁM SÁT code demo chính thức của VNPay: sai 1 ly ở bước encode là sai chữ ký.

// Đọc cấu hình mỗi lần dùng (không cache lúc import) để chắc dotenv đã nạp; thiếu thì
// fail ngay với thông báo rõ ràng (giống jwt.getSecret).
function getVnpConfig() {
  const tmnCode = process.env.VNP_TMN_CODE;
  const hashSecret = process.env.VNP_HASH_SECRET;
  const url = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURN_URL;
  if (!tmnCode || !hashSecret || !url || !returnUrl) {
    throw new Error('Thiếu cấu hình VNPay (VNP_TMN_CODE/VNP_HASH_SECRET/VNP_URL/VNP_RETURN_URL) trong .env');
  }
  return { tmnCode, hashSecret, url, returnUrl };
}

// Kiểm tra cấu hình VNPay đã đủ — gọi TRƯỚC khi tạo đơn VNPay để fail SỚM,
// tránh tạo đơn (đã trừ kho, dọn giỏ) rồi mới lỗi vì thiếu env.
export function assertVnpayConfigured(): void {
  getVnpConfig();
}

// So sánh chữ ký timing-safe (chống timing attack so với === thường).
function hashEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Sắp xếp tham số theo alphabet + encode đúng kiểu VNPay: encodeURIComponent rồi đổi %20→+.
// PHẢI giống hệt demo VNPay vì server VNPay ký lại theo đúng thuật toán này để đối chiếu.
function sortObject(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj)
    .map((k) => encodeURIComponent(k))
    .sort();
  for (const key of keys) {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

// Nối thành chuỗi "key=value&key=value..." — KHÔNG encode lại (values đã encode trong sortObject).
// (Không dùng querystring.stringify vì node:querystring không có tùy chọn encode:false như lib `qs`.)
function toQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

// Ký HMAC-SHA512 trên chuỗi querystring đã sắp xếp + encode.
function sign(params: Record<string, string>, hashSecret: string): string {
  const signData = toQueryString(params);
  return createHmac('sha512', hashSecret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

// Định dạng ngày yyyyMMddHHmmss theo giờ VN (GMT+7). Tính offset thủ công để KHÔNG phụ
// thuộc timezone máy server (server cloud thường chạy UTC).
function formatVnpDate(date: Date): string {
  const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    gmt7.getUTCFullYear().toString() +
    pad(gmt7.getUTCMonth() + 1) +
    pad(gmt7.getUTCDate()) +
    pad(gmt7.getUTCHours()) +
    pad(gmt7.getUTCMinutes()) +
    pad(gmt7.getUTCSeconds())
  );
}

export interface BuildPaymentUrlParams {
  txnRef: string; // mã giao dịch (Payment.txn_ref), duy nhất mỗi lần thử
  amount: number; // số tiền VND (CHƯA nhân 100)
  orderInfo: string; // mô tả đơn (không dấu cho an toàn)
  ipAddr: string; // IP người đặt (lấy từ req)
}

// Dựng URL redirect sang trang thanh toán VNPay. Trả về URL đầy đủ kèm vnp_SecureHash.
export function buildPaymentUrl({ txnRef, amount, orderInfo, ipAddr }: BuildPaymentUrlParams): string {
  const cfg = getVnpConfig();
  const now = new Date();

  let params: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: cfg.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: String(amount * 100), // VNPay tính theo đơn vị nhỏ nhất → ×100
    vnp_ReturnUrl: cfg.returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: formatVnpDate(now),
    vnp_ExpireDate: formatVnpDate(new Date(now.getTime() + 15 * 60 * 1000)), // hết hạn sau 15 phút
  };

  params = sortObject(params);
  params.vnp_SecureHash = sign(params, cfg.hashSecret);

  // Nối thẳng chuỗi đã encode — encode lần nữa sẽ hỏng chữ ký
  return `${cfg.url}?${toQueryString(params)}`;
}

// Xác thực callback (Return + IPN) từ VNPay: ký lại phần tham số (bỏ vnp_SecureHash)
// rồi so với chữ ký VNPay gửi. Khớp → dữ liệu chưa bị sửa trên đường truyền.
export function verifyCallback(query: Record<string, string>): { valid: boolean } {
  const received = (query.vnp_SecureHash ?? '').toLowerCase();

  // Bỏ 2 field chữ ký ra khỏi dữ liệu cần ký lại
  const params = { ...query };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const expected = sign(sortObject(params), getVnpConfig().hashSecret);
  return { valid: hashEquals(received, expected) };
}
