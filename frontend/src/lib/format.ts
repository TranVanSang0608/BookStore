// Định dạng tiền VND theo chuẩn đã chốt trong THIET-KE.md: "30.000đ"
// Intl.NumberFormat với locale vi-VN tự dùng dấu chấm ngăn cách hàng nghìn
export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

// Ngày giờ kiểu Việt Nam "13/06/2026 10:30" — dùng cho ngày đặt đơn
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
