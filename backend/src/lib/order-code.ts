import { randomInt } from 'node:crypto';

// Bảng ký tự sinh mã đơn — CỐ Ý bỏ các ký tự dễ đọc nhầm: 0/O, 1/I/L.
// Còn lại: số 2-9 + chữ cái A-Z trừ I, L, O → khách đọc mã qua điện thoại không nhầm.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const SUFFIX_LENGTH = 5;

// Mã đơn hiển thị cho khách: "BK-YYYYMMDD-XXXXX" (BK = BookStore, khớp ví dụ trong schema).
// - Phần ngày giúp đọc/sắp xếp đơn theo mắt thường.
// - Phần XXXXX random chặn người ngoài đoán mã đơn của người khác.
// - randomInt của crypto: ngẫu nhiên an toàn, không thiên lệch như Math.random()%n.
// Trùng mã là cực hiếm; nếu vẫn trùng thì cột @unique chặn và service retry (xem createOrder).
export function generateOrderCode(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `BK-${yyyy}${mm}${dd}-${suffix}`;
}

// Mã giao dịch gửi sang VNPay (vnp_TxnRef) — phải DUY NHẤT MỖI LẦN THỬ thanh toán
// (retry tạo Payment mới với txn_ref mới) và chỉ gồm chữ-số (VNPay không nhận dấu '-').
// = order_code bỏ '-' + hậu tố thời gian base36 → ngắn, duy nhất, đối soát ngược về đơn dễ.
export function generateTxnRef(orderCode: string): string {
  const base = orderCode.replace(/-/g, '');
  const suffix = Date.now().toString(36).toUpperCase();
  return `${base}${suffix}`;
}
