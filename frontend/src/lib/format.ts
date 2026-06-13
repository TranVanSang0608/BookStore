// Định dạng tiền VND theo chuẩn đã chốt trong THIET-KE.md: "30.000đ"
// Intl.NumberFormat với locale vi-VN tự dùng dấu chấm ngăn cách hàng nghìn
export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}
