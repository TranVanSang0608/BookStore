// Chuyển chuỗi tiếng Việt thành slug dùng trên URL: "Đắc Nhân Tâm" → "dac-nhan-tam".
// Cách hoạt động:
// - normalize('NFD') tách chữ và dấu thành 2 ký tự riêng (vd "ắ" → "a" + ký tự dấu sắc)
// - xóa toàn bộ ký tự dấu: \p{M} là Unicode property "Mark" (combining mark), cờ u bật chế độ Unicode
// - riêng đ/Đ không phải "d có dấu" nên NFD không tách được — phải thay thủ công
export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // mọi cụm ký tự không phải chữ/số → 1 dấu gạch ngang
    .replace(/^-+|-+$/g, ''); // cắt dấu gạch thừa ở 2 đầu
}
