import { useFreeShipThreshold } from '../../hooks/useFreeShipThreshold'
import { formatPrice } from '../../lib/format'
import LegalPage, { LegalSection } from './LegalPage'

export default function TermsPage() {
  const freeShipThreshold = useFreeShipThreshold() // ngưỡng miễn phí ship (admin sửa ở /admin/shipping)
  return (
    <LegalPage title="Điều khoản dịch vụ" updated="06/2026">
      <LegalSection heading="1. Giới thiệu">
        <p>
          Ánh Sách là website bán sách trực tuyến. Đây là sản phẩm đồ án học tập, chạy trên môi
          trường thử nghiệm (VNPay sandbox), không phải cửa hàng thương mại thực tế. Khi sử dụng
          website, bạn đồng ý với các điều khoản dưới đây.
        </p>
      </LegalSection>
      <LegalSection heading="2. Tài khoản">
        <p>
          Bạn có thể xem và thêm sách vào giỏ mà không cần đăng nhập; khi đặt hàng cần đăng nhập.
          Bạn chịu trách nhiệm giữ an toàn cho thông tin đăng nhập của mình.
        </p>
      </LegalSection>
      <LegalSection heading="3. Đặt hàng & thanh toán">
        <p>
          Đơn hàng được xác nhận sau khi bạn hoàn tất bước đặt hàng. Hỗ trợ thanh toán khi nhận hàng
          (COD) hoặc qua VNPay. Giá sản phẩm đã bao gồm VAT, hiển thị bằng VNĐ.
        </p>
      </LegalSection>
      <LegalSection heading="4. Giao hàng">
        <p>
          Phí giao hàng tính theo tỉnh/thành; <strong>miễn phí cho đơn từ {formatPrice(freeShipThreshold)}</strong>. Thời
          gian dự kiến: 24h nội thành, 2–4 ngày các tỉnh khác.
        </p>
      </LegalSection>
      <LegalSection heading="5. Đổi trả">
        <p>
          Bạn có thể đổi/trả trong vòng 7 ngày kể từ khi nhận hàng nếu sách bị lỗi in ấn hoặc hư
          hỏng do vận chuyển. Vui lòng giữ sách ở tình trạng ban đầu.
        </p>
      </LegalSection>
      <LegalSection heading="6. Thay đổi điều khoản">
        <p>
          Chúng tôi có thể cập nhật điều khoản theo thời gian; phiên bản mới sẽ được đăng tại trang
          này.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
