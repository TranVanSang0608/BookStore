# Sổ thuật ngữ — đồ án Website bán sách

> Sổ tay tra nhanh cho người mới. Mỗi từ: định nghĩa 1–2 câu + ví dụ đời thường.
> Gặp từ lạ khi đọc code/giải thích của AI → tra ở đây. Chưa có thì bảo AI thêm vào.

---

## A. Web hoạt động cơ bản

**Frontend (FE) / Backend (BE)**
FE là phần người dùng NHÌN THẤY và bấm (trang web trên trình duyệt). BE là phần chạy ngầm trên server, xử lý logic + giữ dữ liệu. _Ví dụ: FE là mặt tiền quán cà phê (bàn ghế, menu khách thấy); BE là nhà bếp + kho (khách không thấy nhưng làm ra đồ)._ Đồ án này: FE ở folder `frontend/`, BE ở `backend/`.

**API**
Là "danh sách dịch vụ" mà BE cho phép FE gọi. FE không tự chạm vào database — nó gọi API, BE làm rồi trả kết quả. _Ví dụ: như gọi món qua nhân viên phục vụ — bạn không tự vào bếp, bạn đọc menu (API) và yêu cầu._

**Endpoint**
Là MỘT địa chỉ cụ thể trong API, dạng `/api/books` hay `/api/cart`. Mỗi endpoint làm một việc. _Ví dụ: mỗi món trong menu là một endpoint; "cà phê sữa" = `/api/coffee`._

**Request / Response**
Request = lời yêu cầu FE gửi lên BE. Response = câu trả lời BE gửi về. _Ví dụ: bạn nói "cho 1 cà phê" (request), nhân viên bưng ra ly cà phê (response)._

**REST**
Là một bộ "quy ước đặt tên" cho API: dùng các động từ GET (lấy), POST (tạo mới), PUT (sửa), DELETE (xóa) trên từng endpoint. _Ví dụ: như quy ước chung trong nhà hàng để ai cũng hiểu "order", "hủy", "đổi món" nghĩa là gì._

**SPA (Single Page Application)**
Web mà khi bấm chuyển trang KHÔNG tải lại cả trang — chỉ thay phần nội dung, nên mượt và nhanh. _Ví dụ: như lật trang trong một app điện thoại, không phải mở lại app từ đầu._ Đồ án dùng React để làm SPA.

---

## B. Bên trong Backend

**Route / Routing**
"Bảng chỉ đường": URL nào thì chạy đoạn xử lý nào. _Ví dụ: tổng đài bấm phím 1 gặp kế toán, phím 2 gặp kỹ thuật — routing là cái bảng phân nhánh đó._ File `routes.ts` trong mỗi module.

**Middleware**
Đoạn code chạy XEN GIỮA trước khi tới xử lý chính — để kiểm tra/lọc. _Ví dụ: bảo vệ ở cổng kiểm vé trước khi bạn vào rạp phim; chưa có vé thì chặn lại luôn._ Đồ án: `auth` (kiểm đăng nhập), `validate` (kiểm dữ liệu hợp lệ).

**Controller**
Người "điều phối" cho một endpoint: nhận request, gọi service làm việc, rồi trả response. Bản thân nó KHÔNG chứa logic phức tạp. _Ví dụ: nhân viên phục vụ — nhận order, chuyển vào bếp, bưng món ra; không tự nấu._

**Service**
Nơi chứa LOGIC NGHIỆP VỤ thật sự (tính tiền, trừ kho, ký thanh toán). Đây là phần quan trọng nhất, đọc kỹ nhất. _Ví dụ: đầu bếp trong bếp — người thực sự làm ra món._

**Validation (Zod)**
Kiểm tra dữ liệu gửi lên có ĐÚNG ĐỊNH DẠNG không trước khi xử lý (email có đúng dạng email, số lượng có phải số dương...). Zod là thư viện làm việc này. _Ví dụ: kiểm tờ khai có điền đủ ô bắt buộc chưa trước khi nhận hồ sơ._

**Cron job**
Việc tự động chạy theo lịch định kỳ, không cần ai bấm. _Ví dụ: đồng hồ báo thức lặp lại mỗi sáng._ Đồ án: cứ 15 phút quét và hủy đơn "treo" quá 24h chưa thanh toán.

**Email service / SMTP**
Dịch vụ giúp web tự gửi email (xác nhận đơn, đặt lại mật khẩu...). SMTP là "giao thức bưu điện" chuẩn để gửi mail. _Ví dụ: như thuê một bưu tá chuyên đi giao thư thay mình._ Đồ án Phase 6 dùng dịch vụ Resend thay vì tự dựng SMTP.

**Resend**
Một dịch vụ gửi email qua API: web chỉ cần 1 "API key" rồi gọi lệnh gửi, Resend lo phần giao thư. _Ví dụ: như app giao hàng — bạn đưa kiện hàng + địa chỉ, họ lo chuyện vận chuyển._ Đồ án dùng Resend cho toàn bộ email (D50).

**HTML email**
Email viết bằng HTML để có màu, nút bấm, bố cục — không chỉ chữ trơn. Khác web thường: ứng dụng mail không nạp CSS ngoài nên phải viết style "nhúng thẳng" vào từng thẻ. _Ví dụ: như thiệp mời in sẵn màu mè, khác tờ giấy viết tay._

**Fail-soft (hỏng êm)**
Một việc phụ nếu lỗi thì BỎ QUA êm, không làm sập việc chính. _Ví dụ: máy in hóa đơn hỏng nhưng khách vẫn mua hàng được — chỉ là không có tờ hóa đơn._ Đồ án: gửi email lỗi thì đơn vẫn đặt thành công, chỉ ghi log.

---

## C. Cơ sở dữ liệu (Database)

**Database (DB)**
Kho lưu dữ liệu lâu dài (sách, đơn hàng, user). Đồ án dùng PostgreSQL. _Ví dụ: cái tủ hồ sơ khổng lồ, tắt máy mở lại vẫn còn nguyên._

**Bảng (Table) / Bản ghi (Row)**
DB chia thành các bảng (Book, Order, User...). Mỗi bảng là một cái sheet Excel; mỗi dòng (row) là một bản ghi. _Ví dụ: bảng Book như sheet "Danh sách sách", mỗi dòng là một cuốn._

**ORM (Prisma)**
Cầu nối giúp viết code bằng JavaScript để thao tác DB thay vì viết câu lệnh SQL thô. Prisma là ORM của đồ án. _Ví dụ: như phiên dịch viên — bạn nói tiếng Việt (JS), nó dịch sang ngôn ngữ DB (SQL)._

**Schema**
Bản thiết kế của DB: có những bảng nào, mỗi bảng có cột gì. File `schema.prisma`. _Ví dụ: bản vẽ kiến trúc ngôi nhà trước khi xây._

**Migration**
Một lần thay đổi cấu trúc DB có ghi lại lịch sử (thêm bảng, thêm cột). _Ví dụ: nhật ký sửa nhà — lần này thêm phòng, lần kia phá tường, có ghi từng lần._

**Seed**
Đổ dữ liệu mẫu ban đầu vào DB trống (vài cuốn sách, 1 tài khoản admin). _Ví dụ: bày sẵn hàng mẫu lên kệ trước ngày khai trương._

**Transaction (giao dịch)** ⭐ rất quan trọng cho đồ án
Gom nhiều thao tác DB thành MỘT khối "được ăn cả, ngã về không": hoặc thành công hết, hoặc lỗi thì hủy sạch như chưa làm gì. _Ví dụ: chuyển khoản — trừ tiền tài khoản A và cộng tiền tài khoản B phải cùng thành công; không thể trừ A xong mà B không nhận._ Đồ án: tạo đơn = tạo Order + trừ kho + tạo Payment, phải cùng thành công.

**Index**
"Mục lục" giúp DB tìm dữ liệu nhanh thay vì dò từng dòng. _Ví dụ: mục lục cuối sách để tra trang, khỏi lật từng trang._

---

## D. Bảo mật & đăng nhập

**Authentication vs Authorization**
Authentication = "bạn LÀ AI" (đăng nhập đúng tài khoản chưa). Authorization = "bạn ĐƯỢC LÀM GÌ" (user thường không vào được trang admin). _Ví dụ: vào tòa nhà — bảo vệ kiểm CMND (authentication), rồi thẻ của bạn chỉ mở được tầng của bạn (authorization)._

**JWT / Token**
Tấm "vé" mã hóa server cấp cho bạn sau khi đăng nhập. Mỗi lần gọi API bạn đưa vé này ra để chứng minh đã đăng nhập. _Ví dụ: vòng tay vào cổng lễ hội — quẹt vào rồi đeo vòng, đi đâu chỉ cần giơ vòng, khỏi mua vé lại._ Đồ án lưu token trong `localStorage` của trình duyệt.

**Hash**
Biến mật khẩu thành chuỗi rối không đọc ngược được, để DB không lưu mật khẩu gốc. _Ví dụ: xay sinh tố — xay táo ra nước thì không ghép lại thành quả táo cũ._ (`password_hash` trong bảng User.)
> ⚠️ Hash KHÁC mã hóa (encryption): mã hóa có chìa khóa giải ngược lại được (2 chiều); hash KHÔNG có đường về (1 chiều). Khi bảo vệ đừng gọi hash là "mã hóa".

**Salt**
Một chuỗi ngẫu nhiên trộn vào mật khẩu TRƯỚC khi hash, để 2 người đặt cùng mật khẩu vẫn ra 2 chuỗi hash khác nhau. _Ví dụ: 2 người nấu cùng món nhưng mỗi người nêm một kiểu — nếm ra không giống nhau._ Chống kẻ xấu dùng "bảng tra hash sẵn" (rainbow table). Trong đồ án, `bcrypt` tự sinh salt và gắn luôn vào chuỗi hash.

**User enumeration (dò tài khoản)**
Kẽ hở khi web vô tình tiết lộ email nào ĐÃ đăng ký (vd báo "email chưa tồn tại"). Kẻ xấu lợi dụng để lập danh sách nạn nhân rồi tấn công có chủ đích. _Ví dụ: hỏi lễ tân "phòng 305 có ông A không" — trả lời thẳng là lộ thông tin._ Đồ án chặn bằng cách báo CHUNG "Email hoặc mật khẩu không đúng".

**HMAC / chữ ký (VNPay)**
Cách "đóng dấu niêm phong" dữ liệu để bên nhận biết nó không bị sửa giữa đường. _Ví dụ: niêm phong sáp trên thư — rách dấu là biết có người mở trộm._ Đồ án dùng để xác minh VNPay báo về có thật không.

**CORS**
Quy tắc chỉ cho phép FE của ĐÚNG website mình gọi API, chặn web lạ. _Ví dụ: danh sách khách mời ở cửa — không có tên thì không cho vào._

**Rate limit**
Giới hạn số lần gọi trong một khoảng thời gian, chống kẻ xấu thử mật khẩu hàng nghìn lần. _Ví dụ: nhập sai mã ATM 3 lần là khóa thẻ._

**Token dùng-một-lần (link email)**
Chuỗi bí mật ngẫu nhiên nhúng trong link gửi qua email (xác thực email / đặt lại mật khẩu). Dùng xong là "cháy", có hạn giờ. _Ví dụ: mã OTP một lần — nhập rồi thì lần sau vô hiệu._ Đồ án: DB chỉ lưu **bản hash** của token (như mật khẩu), token thật chỉ ở trong email; bấm link 2 lần thì chỉ lần đầu có tác dụng (bảng `EmailToken`).

**localStorage**
Ngăn lưu trữ nhỏ ngay trong trình duyệt, tắt mở lại vẫn còn. _Ví dụ: ngăn kéo cá nhân trên máy bạn._ Đồ án: lưu token đăng nhập + giỏ hàng của khách chưa đăng nhập.

---

## E. Khái niệm riêng của đồ án này

**SNAPSHOT (chụp ảnh lại)** ⭐
Đơn hàng tự "chụp lại" tên sách, giá, địa chỉ TẠI LÚC ĐẶT — không phụ thuộc dữ liệu gốc nữa. Sau này sách đổi giá hay bị xóa thì đơn cũ vẫn đọc đúng. _Ví dụ: hóa đơn giấy in lúc mua — sau này shop tăng giá thì tờ hóa đơn cũ vẫn ghi giá lúc đó._

**Idempotent (làm lại không hại)** ⭐
Một thao tác chạy 1 lần hay 10 lần kết quả vẫn như nhau, không nhân đôi. _Ví dụ: bấm nút thang máy 5 lần thang vẫn chỉ tới 1 lần._ Đồ án: VNPay báo về 2 lần (return + ipn) thì đơn cũng chỉ ghi "đã trả tiền" 1 lần.

**Race condition (tranh chấp)**
Hai việc chạy CÙNG LÚC giẫm lên nhau gây sai dữ liệu. _Ví dụ: 2 người cùng rút đồng tiền cuối trong tài khoản đúng một khoảnh khắc._ Đồ án xử lý bằng transaction + trừ kho có điều kiện để 2 người mua cuốn cuối cùng thì chỉ 1 người thành công.

**CRUD**
4 thao tác cơ bản với dữ liệu: Create (tạo), Read (đọc), Update (sửa), Delete (xóa). _Ví dụ: quản lý danh bạ — thêm/xem/sửa/xóa liên hệ._ Trang admin quản lý sách chính là CRUD.

**Cache (React Query)**
Lưu tạm kết quả vừa lấy để lần sau hiện ngay, khỏi gọi lại server. _Ví dụ: nhớ đường đã đi hôm qua, hôm nay khỏi tra bản đồ lại._

**COD / VNPay**
COD = trả tiền mặt khi nhận hàng. VNPay = cổng thanh toán online (quẹt thẻ/QR). Đồ án hỗ trợ cả hai.

**Voucher / mã giảm giá**
Mã chữ-số nhập lúc đặt hàng để được bớt tiền. Đồ án có 2 kiểu: giảm theo **phần trăm** (vd 10%, có thể chặn trần) hoặc **số tiền cố định** (vd 20.000đ). _Ví dụ: phiếu giảm giá ở siêu thị._ Có điều kiện: đơn tối thiểu, hạn dùng, tổng lượt, và **mỗi người dùng tối đa mấy lần** (`per_user_limit`).

**used_count / per_user_limit**
`used_count` = đã có bao nhiêu lượt dùng mã (tăng atomic khi đặt đơn, hoàn khi hủy — giống trừ/hoàn kho). `per_user_limit` = một người được dùng mã đó tối đa mấy lần (đếm qua bảng `VoucherUsage`). _Ví dụ: "mỗi khách 1 phiếu", "tổng cửa hàng phát 1000 phiếu"._

**Wishlist (danh sách yêu thích)**
Sách user bấm "tim" để lưu lại xem sau, chưa mua. _Ví dụ: ngăn "để dành" trong app mua sắm._ Đồ án: bấm tim 1 lần là thích, bấm lại là bỏ (toggle); mỗi sách chỉ lưu 1 dòng.

**Verified purchase (đã mua mới được đánh giá)**
Chỉ cho đánh giá sách khi user THẬT SỰ đã mua (có đơn trạng thái "Đã giao" chứa sách đó). _Ví dụ: chỉ khách đã ăn ở quán mới để lại review trên Google Maps._ Chống review giả/spam.

**Denormalize (dữ liệu nhân bản có chủ đích)**
Cố tình lưu sẵn con số tổng hợp (vd điểm sao trung bình + số lượt) ngay trên bảng Book, thay vì mỗi lần hiển thị lại tính từ bảng Review. _Ví dụ: ghi sẵn "4.5★" lên bìa thay vì cộng lại tất cả phiếu mỗi lần ai nhìn._ Đổi lại: phải cập nhật con số này trong transaction mỗi khi review đổi để khỏi lệch.

---

_Cập nhật: thêm từ mới mỗi khi gặp. Giữ định nghĩa ngắn — đây là sổ tra nhanh._
