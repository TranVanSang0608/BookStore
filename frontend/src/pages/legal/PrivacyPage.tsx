import LegalPage, { LegalSection } from './LegalPage'

export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách bảo mật" updated="06/2026">
      <LegalSection heading="1. Thông tin chúng tôi thu thập">
        <p>
          Khi bạn đăng ký và đặt hàng: họ tên, email, số điện thoại và địa chỉ giao hàng. Đây là sản
          phẩm đồ án nên dữ liệu chỉ phục vụ mục đích demo.
        </p>
      </LegalSection>
      <LegalSection heading="2. Mục đích sử dụng">
        <p>
          Thông tin được dùng để xử lý đơn hàng, liên hệ giao hàng và gửi email xác nhận. Chúng tôi
          không gửi quảng cáo ngoài phạm vi này.
        </p>
      </LegalSection>
      <LegalSection heading="3. Lưu trữ & an toàn">
        <p>
          Mật khẩu được lưu dưới dạng <strong>băm (hash)</strong>, không lưu mật khẩu gốc. Chúng tôi
          <strong> không lưu thông tin thẻ ngân hàng</strong> — phần thanh toán do VNPay xử lý.
        </p>
      </LegalSection>
      <LegalSection heading="4. Chia sẻ với bên thứ ba">
        <p>
          Chỉ chia sẻ dữ liệu tối thiểu cần thiết cho cổng thanh toán VNPay khi bạn chọn thanh toán
          online. Chúng tôi không bán hay trao đổi dữ liệu cá nhân của bạn.
        </p>
      </LegalSection>
      <LegalSection heading="5. Quyền của bạn">
        <p>
          Bạn có thể xem và cập nhật thông tin cá nhân, địa chỉ trong trang Tài khoản bất cứ lúc nào.
        </p>
      </LegalSection>
      <LegalSection heading="6. Liên hệ">
        <p>Mọi thắc mắc về bảo mật, vui lòng liên hệ: hello@anhsach.vn — Hotline 1900 1234.</p>
      </LegalSection>
    </LegalPage>
  )
}
