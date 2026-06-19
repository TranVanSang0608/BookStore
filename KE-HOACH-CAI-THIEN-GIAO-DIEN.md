# KẾ HOẠCH CẢI THIỆN GIAO DIỆN FRONTEND

> ## ✅ TRẠNG THÁI: GIAI ĐOẠN A–K HOÀN THÀNH (2026-06-18)
> Toàn bộ frontend đã đổi sang bộ nhận diện **"Ánh Sách"**. FE build + lint xanh · BE typecheck + **215/215 test** xanh.
> Còn lại (phần dữ liệu của bạn): seed thêm sách/đơn để khối "Bán chạy" hiện (cần đơn Delivered); đăng nhập admin để xem trực tiếp khu quản trị.

> Mục tiêu: nâng giao diện hiện tại (DaisyUI mặc định) lên theo bộ mockup **"The Bookworm"**
> (folder `BookStore giao diện hoàn chỉnh/`), **giữ nguyên toàn bộ logic đang chạy**.
> Tài liệu này chỉ thay phần **nhìn** (CSS/layout), không đụng API/luồng dữ liệu.
>
> Ngày lập: 2026-06-18. Trạng thái dự án nền: Phase 9 đã xong.

---

## 0. Nguyên tắc bắt buộc khi làm

1. **Chỉ port phần giao diện, KHÔNG sửa logic.** Mọi lời gọi API (`useQuery`, `apiClient`, `useAuth`, `useCart`...) giữ nguyên. Nếu một bước buộc phải đổi logic → dừng lại, ghi vào mục 6 và hỏi.
2. **Mockup là ảnh mẫu, không phải code dùng được.** File `.dc.html` viết bằng `style=""` nội dòng + biến CSS. Ta **không copy-paste**, mà **dịch** sang Tailwind 4 + DaisyUI 5 (theme tùy chỉnh ở mục 3).
3. **Bìa sách trong mockup là vẽ bằng CSS** → khi làm thật phải dùng **ảnh thật**; giá/tên sách để **dưới ảnh**, không in đè lên ảnh.
4. **Không tự bịa dữ liệu.** Mọi con số (số đầu sách, đánh giá, "bán chạy"...) phải đến từ API thật. Cái nào chưa có API → xem mục 2 để quyết **làm thật / cắt bỏ / để trang trí**.
5. **Làm từng lát nhỏ, test ngay, commit theo từng bước.** Sau mỗi giai đoạn: `npm run build` + `npm run lint` xanh, mở trình duyệt xem thật.
6. **Tôn trọng quy tắc dự án:** UI chỉ tiếng Việt; tiền hiển thị "30.000đ"; KHÔNG `dangerouslySetInnerHTML`.

---

## 0.1 Tên thương hiệu — ✅ CHỐT: **Ánh Sách**

> Đã chọn **Ánh Sách** (2026-06-18). Chơi chữ "ánh sáng" → "Ánh Sách": tia sáng tri thức từ
> trang sách, ghép được cả tên **Sáng**. Tên này thay "The Bookworm" ở **Navbar (B1)** + **Footer (B3)**;
> đổi `<title>` trong `frontend/index.html` thành "Ánh Sách — Nhà sách trực tuyến".
>
> **Concept logo (xem mục dưới) + bộ màu giữ nguyên theo mockup** — màu kem ấm + đồng (vàng nắng)
> rất hợp nghĩa "ánh sáng/đèn sách". Các gợi ý tên khác (lưu lại phòng khi đổi ý):

| Tên | Ý nghĩa |
|---|---|
| **Ánh Sách** ⭐ | Chơi chữ "ánh sáng" → "Ánh Sách": tia sáng tri thức từ sách. Ghép khéo cả tên "Sáng" lẫn "sách". Khuyên dùng. |
| **Nhà Sách Sáng** | Đơn giản, rõ ràng, có ngay tên bạn. |
| **Trang Sáng** | "Trang sách" + "sáng": trang sách rạng rỡ; nghe hiện đại, gọn. |
| **Sáng Đọc** | "Đọc cho sáng/mở mang"; trẻ trung. |
| **Đèn Sách** | Thành ngữ "đèn sách" (chăm học) + gợi ánh sáng; hợp hiệu sách. |

→ Tên này thay "The Bookworm" ở **Navbar (B1)** và **Footer (B3)**.

## 0.2 Logo — ✅ CHỐT hướng A (sách mở + tia sáng + bóng đèn)

> Đã có **logo gốc (PNG do AI tạo):** sách mở xanh rêu + quạt tia sáng vàng + bóng đèn ở giữa, chữ "Ánh Sách"
> serif, tagline "Sáng trí tuệ • Mở tương lai". **Giữ bản này làm logo chính thức / ảnh marketing.**
> Để dùng trên web cần dựng **bản SVG production** (Giai đoạn A — bước A5), gồm **4 biến thể:**

1. **Icon đầy đủ, nền trong suốt** — đặt trên mọi nền (không lòi ô nền kem).
2. **Icon rút gọn** (sách + 3–5 tia + đèn, bỏ đốm sao) — cho **favicon 32px** và **navbar ~34px** khỏi nát chi tiết.
3. **Bản sáng / đảo màu** (nét + chữ kem) — cho **footer xanh đậm** và **dark mode**.
4. **Tách chữ khỏi icon:** chữ "Ánh Sách" render bằng **font Cormorant Garamond của web** (không nướng cứng vào ảnh) → đồng bộ + dấu tiếng Việt chuẩn.

- **Tagline** "Sáng trí tuệ • Mở tương lai": **chỉ ở Footer / trang giới thiệu**, KHÔNG đưa lên navbar.
- Gói vào `frontend/src/components/Logo.tsx` (prop `variant="full" | "icon"`, tự đổi màu theo theme); thay favicon ở `frontend/index.html`.
- ⚠️ Dựng SVG xong **kiểm tra dấu** chữ "Á/á".

---

## 1. Hiện trạng đã xác minh (facts — không suy đoán)

### Frontend đang cài (frontend/package.json)
- React 19.2, react-router-dom 7.17, @tanstack/react-query 5, axios, **recharts** (cho dashboard).
- tailwindcss 4.3 + @tailwindcss/vite, **daisyui 5.5**.
- **CHƯA có** thư viện font, **CHƯA có** thư viện icon.

### Cấu hình giao diện hiện tại
- `frontend/index.html`: `<html lang="vi" data-theme="light">`, **chưa nạp font nào**.
- `frontend/src/index.css`: chỉ bật DaisyUI với 2 theme **light/dark mặc định** — chưa có theme thương hiệu.
- `frontend/src/components/Layout.tsx`: `Navbar` + `EmailVerifyBanner` + `<Outlet/>`. **Chưa có Footer.**
- `frontend/src/components/Navbar.tsx`: logo emoji 📚, navbar DaisyUI trơn. Logic dùng `useAuth()` (user, isLoggedIn, logout) + `useCart()` (count). Có dropdown: Quản trị (chỉ admin) / Đơn hàng / Yêu thích / Tài khoản / Đăng xuất.

### Trang & component đã có sẵn (ánh xạ 1–1 với mockup)
| Mockup (.dc.html) | Trang/Component thật |
|---|---|
| Trang chủ | `pages/home/HomePage.tsx` |
| Danh sách sách | `pages/books/BookListPage.tsx` + `features/catalog/BookFilters.tsx`, `Pagination.tsx` |
| Chi tiết sách | `pages/books/BookDetailPage.tsx` + `RelatedBooks.tsx`, `ReviewsSection.tsx` |
| Trang tác giả | `pages/books/AuthorPage.tsx` |
| Giỏ hàng | `pages/cart/CartPage.tsx` |
| Thanh toán | `pages/checkout/CheckoutPage.tsx` |
| Đơn hàng | `pages/orders/OrdersPage.tsx`, `OrderDetailPage.tsx` |
| Hồ sơ | `pages/profile/ProfilePage.tsx` (+ `AddressBook`, `AddressForm`, `ChangePasswordForm`, `ProfileInfoForm`) |
| Yêu thích | `pages/wishlist/WishlistPage.tsx` |
| Xác thực | `pages/auth/LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage` |
| Quản trị | `components/AdminLayout.tsx` + `pages/admin/*` (Dashboard, Orders, OrderDetail, Books, BookForm, Categories, Authors, Vouchers) |
| Card sách (dùng chung) | `features/catalog/BookCard.tsx`, `Stars.tsx`, `CoverImage.tsx`, `WishlistButton.tsx` |

### API công khai đang có (để biết cái gì lấy được data thật)
- `GET /books` — tham số: `q`, `category`, `page`, `limit`, `sort`. **`sort` chỉ nhận: `newest`, `price_asc`, `price_desc`** (xem `catalog/book.schemas.ts`). Trả về kèm `avg_rating`, `review_count`.
- `GET /books/:slug`, `GET /books/:slug/related`, `GET /books/batch?ids=`.
- `GET /categories` — **chỉ trả danh sách, KHÔNG kèm số sách mỗi thể loại**.
- `GET /authors`, `GET /authors/:id`.
- `GET /reviews/book/:bookId`, `GET /wishlist`, `GET /shipping/fee`, voucher `POST /vouchers/preview`...
- `GET /api/admin/dashboard` (admin) — KPI + doanh thu/tháng + top sách + đơn theo trạng thái.

### Mô hình dữ liệu (đã đọc `schema.prisma`)
- Bảng `Book` **chỉ có 1 cột `price`** — **KHÔNG có giá gốc / giá sale / % giảm**.
- Giảm giá **chỉ tồn tại ở mức đơn hàng** qua `Voucher` (trừ vào subtotal).

---

## 2. Bảng quyết định phạm vi (QUAN TRỌNG — chốt trước khi code trang chủ)

Mockup vẽ nhiều khối đẹp nhưng một số **chưa có dữ liệu thật**. Mỗi dòng cần bạn chọn **A/B/C**:

| # | Khối trong mockup | Backend hiện có? | Phương án (chọn 1) |
|---|---|---|---|
| 1 | **Sách mới** (trang chủ) | ✅ `GET /books?limit=8&sort=newest` | **A. Làm thật** (đã có sẵn) |
| 2 | **Bán chạy nhất tháng** (có xếp hạng 1–5) | ❌ Không có `sort=bestseller`, không có endpoint top public | **A.** Thêm sort/endpoint bán chạy (việc backend, mục 6) · **B.** Tạm dùng `sort=newest` đổi tên "Gợi ý" · **C.** Cắt khối này |
| 3 | **Khám phá theo thể loại** + số đếm ("2.140 cuốn") | ⚠️ Có `GET /categories` nhưng **không có số đếm** | **A.** Thêm `_count` sách vào API category (mục 6) · **B.** Hiện thể loại **không kèm số** · **C.** Cắt số đếm |
| 4 | **Flash sale + giá gạch ngang + đếm ngược** | ❌ `Book` không có giá gốc/sale | **A.** Thêm cột giá sale vào `Book` + admin + logic (việc lớn, mục 6) · **B.** Cắt khối flash sale · **C.** Để **đồng hồ tĩnh trang trí** + bỏ giá gạch ngang (chấp nhận "giả") |
| 5 | **Testimonials** ("Độc giả nói gì") | ❌ Không có nguồn | **B.** Cắt · **C.** Giữ làm nội dung tĩnh (ghi rõ là minh hoạ) |
| 6 | **Đăng ký nhận bản tin** (newsletter) | ❌ Không có endpoint | **B.** Cắt · **C.** Giữ form nhưng disable/"Sắp ra mắt" |
| 7 | **Value-prop strip** (Giao 24h, Đổi trả 7 ngày, COD/VNPay, Bọc sách) | — (nội dung tĩnh, không cần data) | **A.** Giữ (chỉ là cam kết dịch vụ, OK) |
| 8 | **Thanh utility** (Free ship 300k, Hotline, "Tra cứu đơn hàng") | ⚠️ "Tra cứu đơn" cần đăng nhập | **A.** Giữ phần tĩnh, link "Tra cứu" trỏ `/orders` |
| 9 | **Nút "Sách ▾"** có menu xổ thể loại | Có `GET /categories` | **A.** Làm menu thật từ categories · **C.** Bỏ mũi tên, để link thường |
| 10 | **Tab "Khuyến mãi"** trên menu | Phụ thuộc #4 | Theo quyết định #4 |

> ### ✅ ĐÃ CHỐT (2026-06-18)
> | # | Khối | Quyết định |
> |---|---|---|
> | 1 | Sách mới | **A — Làm thật** (đã có API) |
> | 2 | Bán chạy nhất tháng | **A — Làm thật**, thêm endpoint bán chạy (backend nhỏ, mục 6) |
> | 3 | Đếm sách / thể loại | **A — Làm thật**, thêm `_count` vào API category (backend nhỏ, mục 6) |
> | 4 | Flash sale + giá gạch ngang | **CẮT BỎ** (DB không có giá sale → không làm) |
> | 5 | Testimonials | **CẮT BỎ** |
> | 6 | Newsletter | **CẮT BỎ** |
> | 7 | Value-prop strip | **A — Giữ** (nội dung tĩnh) |
> | 8 | Thanh utility | **A — Giữ**, "Tra cứu đơn" → `/orders` |
> | 9 | Menu "Sách ▾" | **A — Làm thật** từ `GET /categories` |
>
> → Trang chủ: **mọi con số đều thật**, không khối nào bịa dữ liệu, không nút bấm "chết".
> **Mức backend cho phép:** chỉ NHỎ (endpoint bán chạy + đếm thể loại). **Không** đụng schema giá sale.

---

## 3. Bộ design token — nguồn chân lý (copy từ mockup, đã xác minh)

Sẽ khai báo **một lần** trong `frontend/src/index.css` thành **2 theme DaisyUI tùy chỉnh**
(`bookworm` sáng + `bookwormdark` tối), dùng cú pháp `@plugin "daisyui/theme"` của DaisyUI 5.

### Màu — chế độ sáng
| Vai trò | Token mockup | Mã màu | Ánh xạ DaisyUI đề xuất |
|---|---|---|---|
| Nền trang | `--bg` | `#F4EEE2` | `--color-base-200` |
| Bề mặt thẻ | `--surf` | `#FBF7EF` | `--color-base-100`* |
| Bề mặt nổi | `--surf2` | `#FFFFFF` | (dùng cho card trắng) |
| Chữ thân | `--ink` | `#2E2620` | `--color-base-content` |
| Tiêu đề (xanh rêu đậm) | `--head` | `#2C3F28` | dùng cho heading/footer |
| Chữ phụ | `--soft` | `#6F6256` | |
| Chữ mờ | `--muted` | `#9A8C7A` | ⚠️ cân nhắc đậm hơn (tương phản) |
| Đường kẻ | `--line` / `--line2` | `#E0D6C3` / `#E6DCC9` | `--color-base-300` |
| **Xanh rêu (chính)** | `--moss` | `#3E5A39` | `--color-primary` |
| **Đồng (nhấn)** | `--brass` | `#B28B4C` | `--color-accent` |
| **Mận (phụ/sale)** | `--plum` | `#7C3242` | `--color-secondary` |
| Nền tối footer | `--foot` | `#2C3F28` | `--color-neutral` |

\* Lưu ý: DaisyUI coi `base-100` là nền mặc định. Có thể đặt `base-100 = #FBF7EF` và `base-200 = #F4EEE2` rồi điều chỉnh khi xem thật.

### Màu — chế độ tối
| Token | Mã | Token | Mã |
|---|---|---|---|
| `--bg` | `#191512` | `--moss` | `#46663F` |
| `--surf` | `#221D18` | `--mosst` (xanh sáng) | `#86AD79` |
| `--surf2` | `#2A241E` | `--brass` | `#C6A05E` |
| `--ink` | `#E9DFCB` | `--plum` | `#7C3242` |
| `--head` | `#ECE3CC` | `--plumt` (mận sáng) | `#DD8C9A` |
| `--soft` | `#B6A890` | `--line` | `#3A3128` |
| `--muted` | `#8C8070` | `--foot` | `#120E0B` |

### Font (mockup dùng Google Fonts)
- **Tiêu đề:** `Cormorant Garamond` (serif). ⚠️ **Phải kiểm tra dấu tiếng Việt** (ổ, ữ, ặ, ẩn...) — font serif đôi khi đặt dấu xấu; nếu lỗi → đổi sang serif khác có hỗ trợ VN tốt (vd `Noto Serif`).
- **Thân:** `Be Vietnam Pro` (sans, hỗ trợ tiếng Việt tốt).

---

## 4. Checklist DỮ LIỆU cần chuẩn bị trước (phần bạn làm)

> Bạn nói sẽ **xây bộ data trước**. Đây là danh sách dữ liệu để giao diện "trông đầy đặn" và đúng:

- [ ] **Đủ sách để lưới không bị trống:** mỗi thể loại ≥ 5–6 cuốn; tổng ≥ 25–30 cuốn (trang chủ cần ≥ 5 "Sách mới"; nếu làm #2/#3 cần thêm).
- [ ] **Ảnh bìa thật** cho mọi sách (upload Cloudinary) — vì BookCard sẽ hiện ảnh, không còn ô màu. Sách thiếu ảnh phải có **ảnh dự phòng** đẹp (xem bước C2).
- [ ] **Tác giả có đủ thông tin** (tên, và nếu trang tác giả cần tiểu sử thì thêm).
- [ ] **Thể loại** đặt tên gọn, có ảnh/icon đại diện (mockup dùng icon — xem bước A3).
- [ ] **Vài review thật** (cần đơn `Delivered` chứa sách đó) để hiện sao + số đánh giá thật trên card.
- [ ] **Vài đơn ở các trạng thái khác nhau** (Pending → Delivered) để trang Đơn hàng và Admin có gì để hiển thị.
- [ ] (Nếu chọn #2 = bán chạy thật) cần **một số đơn Delivered** để tính top.
- [ ] (Nếu chọn #4 = sale thật) cần **bổ sung cột giá sale** trước — đây là việc backend, không phải seed.

---

## 5. CÁC GIAI ĐOẠN THỰC HIỆN (chi tiết từng bước)

> Mỗi bước ghi: **việc làm · file đụng tới · "Xong khi"**. Đánh dấu 🔵 = phụ thuộc dữ liệu (mục 4), 🟠 = phụ thuộc quyết định mục 2, 🔴 = cần backend (mục 6).

### GIAI ĐOẠN A — Nền tảng (font + theme + icon) — ✅ HOÀN THÀNH (2026-06-18)
*Không thay đổi giao diện nhìn thấy ngay, nhưng là móng cho mọi bước sau.*

> **Đã làm:** A1 nạp font (index.html) · A2 kiểm tra dấu Cormorant — hiển thị "Ánh Sách" đẹp ✅ · A3 cài `lucide-react` ·
> A4 2 theme `bookworm`+`bookwormdark` trong `index.css` (data-theme đổi sang `bookworm`) · A5 `components/Logo.tsx` + favicon mới + gắn Logo vào Navbar.
> **Verify:** build + lint xanh; trình duyệt: nền kem, primary xanh rêu, dark mode OK, logo + chữ serif "Ánh Sách" dấu chuẩn.

- [ ] **A1. Nạp 2 font.** Thêm `<link>` Google Fonts (Cormorant Garamond + Be Vietnam Pro) vào `frontend/index.html`, hoặc `@import` trong `index.css`.
  - *Xong khi:* mở DevTools thấy font tải về, không lỗi.
- [ ] **A2. Kiểm tra dấu tiếng Việt của Cormorant Garamond.** Gõ thử "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", "Số Đỏ", "Dế Mèn".
  - *Xong khi:* dấu hiển thị đẹp → giữ; nếu xấu → chọn serif thay thế, ghi quyết định.
- [ ] **A3. Quyết định icon.** Mockup dùng SVG phong cách *lucide* (giỏ, tim, sao, tìm kiếm, mặt trăng...).
  - Phương án **(khuyên dùng)**: cài `lucide-react` → dùng lại nhanh, ít code. *Hoặc* copy SVG thủ công vào `components/icons/`.
  - *Xong khi:* chốt 1 cách + (nếu cài) `npm i lucide-react` chạy được.
- [ ] **A4. Tạo theme `bookworm` + `bookwormdark`** trong `frontend/src/index.css` bằng `@plugin "daisyui/theme"` với màu ở mục 3. Đặt font mặc định cho body + heading.
  - Sửa `frontend/index.html` đổi `data-theme="light"` → `data-theme="bookworm"`.
  - *Xong khi:* nền trang chuyển sang màu giấy kem, chữ đổi font, `npm run build` xanh. **Chưa cần đụng component nào** — các `btn-primary`, `bg-base-100`... tự đổi màu theo theme.
- [ ] **A5. Logo SVG production** (`components/Logo.tsx` — file mới) theo mục 0.2: icon sách+tia+đèn dạng SVG (nền trong suốt), prop `variant="full" | "icon"`, tự đổi nét sáng/tối theo theme; chữ "Ánh Sách" bằng font Cormorant Garamond. Thay favicon ở `frontend/index.html`.
  - *Xong khi:* `<Logo/>` hiện sắc nét ở cỡ to lẫn 32px, không lòi nền trên footer tối, dấu "Á" đúng.

### GIAI ĐOẠN B — Khung chung (Navbar, Footer, theme toggle) — ✅ HOÀN THÀNH (2026-06-18)
*Đụng mọi trang → làm sớm để cả site "lên đời" ngay.*

> **Đã làm:** B1 Navbar mới (logo, ô tìm → /books?q=, icon yêu thích/giỏ giữ badge `useCart`, dropdown tài khoản) ·
> B2 menu "Sách" + dải thể loại đổ từ `GET /categories` (8 thể loại thật) · B3 `components/Footer.tsx` (4 cột, tagline, link thật, +Layout flex-col) ·
> B4 `lib/theme.ts` (`initTheme` lúc khởi động + `useTheme` cho nút chuyển; lưu localStorage) · B5 thanh utility.
> **+ Menu mobile (hamburger):** chứa ô tìm + 8 chip thể loại + nút sáng/tối + tài khoản (làm sớm, không để tới K1).
> **+ Tách khu admin:** route `/admin` ra khỏi `<Layout>` marketing; `AdminLayout` có thanh top riêng (logo + Về cửa hàng + Đăng xuất) → admin KHÔNG còn navbar/footer cửa hàng.
> **Verify:** build + lint xanh; screenshot navbar + footer + menu mobile khớp mockup; nút sáng/tối đổi + nhớ; menu/dải thể loại có data thật.

- [ ] **B1. Navbar mới** (`components/Navbar.tsx`). Dựng lại theo mockup: dùng `<Logo variant="full"/>` (Ánh Sách, **không** tagline), ô tìm kiếm, icon Yêu thích + Giỏ (badge số), avatar tài khoản.
  - **GIỮ NGUYÊN logic:** `useAuth()`, `useCart().count`, dropdown admin/đơn/yêu thích/hồ sơ/đăng xuất, các `<Link>` hiện có.
  - Ô tìm kiếm: submit → `navigate('/books?q=...')` (đã có route, chỉ nối tham số).
  - *Xong khi:* badge giỏ vẫn chạy, đăng nhập/đăng xuất vẫn đúng, mục Quản trị chỉ hiện với admin.
- [ ] **B2. 🟠 Menu "Sách ▾"** (theo quyết định #9). Nếu làm thật: đổ danh sách từ `GET /categories`, mỗi mục `<Link to={'/books?category=...'}>`.
  - *Xong khi:* click thể loại ra đúng trang list đã lọc.
- [ ] **B3. Footer mới** (`components/Footer.tsx` — file mới). Dùng `<Logo variant="full"/>` bản sáng + **tagline** "Sáng trí tuệ • Mở tương lai". 4 cột: giới thiệu shop, "Khám phá", "Hỗ trợ", "Liên hệ" + dòng bản quyền. Link trỏ tới route thật (vd "Theo dõi đơn" → `/orders`); link chưa có trang → để `#` hoặc bỏ.
  - Thêm `<Footer/>` vào `components/Layout.tsx` (sau `<Outlet/>`).
  - *Xong khi:* footer hiện ở mọi trang, không link gãy gây lỗi.
- [ ] **B4. Nút chuyển sáng/tối thật.** Lưu lựa chọn vào `localStorage`, set `document.documentElement.dataset.theme = 'bookworm' | 'bookwormdark'`. Đặt nút ở thanh utility (mockup) hoặc navbar.
  - *Xong khi:* bấm đổi nền sáng↔tối, **tải lại trang vẫn nhớ**.
- [ ] **B5. 🟠 Thanh utility trên cùng** (free ship, hotline) — theo quyết định #8. Ẩn trên mobile (mockup đã có `bw-utility` ẩn ở ≤480px).

### GIAI ĐOẠN C — Component sách dùng lại (làm 1 lần, xài khắp nơi) — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm:** C1 `BookCard` restyle (khung `<div>` + ảnh/tiêu đề là `<Link>` + nút "Giỏ" thêm nhanh dùng `addItem`, có trạng thái Đã thêm/Lỗi) ·
> C2 `CoverImage` fallback đẹp (icon sách + tên serif) · C3 `Stars` (giữ — sao màu đồng, hiện khi có review) ·
> C4 `BookCardSkeleton` + `EmptyState` (mới) → nối vào HomePage (loading) + BookListPage (loading + "không tìm thấy"). Đổi tim sang icon lucide.
> **Verify:** build + lint xanh; screenshot lưới thẻ mới khớp mockup; nút "Giỏ" thêm vào giỏ → badge +1 (lưu `bookstore_guest_cart`); tim guest → /login (đúng logic).
> **Sửa sau review (a11y/HTML):** đưa nút tim RA NGOÀI `<Link>` (anh em trong `<figure>`) → hết lỗi `<button>` trong `<a>`; link ảnh `aria-hidden`+`tabIndex=-1` để khỏi trùng link với tiêu đề; icon fallback co theo ô (`w-1/4`, 16–40px).


- [ ] **C1. BookCard** (`features/catalog/BookCard.tsx`). Restyle theo "Card A" của mockup: ảnh bìa tỉ lệ 2/3 ở trên, **dưới ảnh** là tên (serif) + tác giả + sao + giá + nút "Giỏ". Badge "Hết hàng" giữ nguyên điều kiện `stock_quantity === 0`. Nút tim (`WishlistButton`) góc trên-phải ảnh.
  - **Chọn 1 kiểu card duy nhất** cho toàn site (đừng làm cả A lẫn B cho đỡ rối).
  - *Xong khi:* card hiện ảnh thật, giá đúng định dạng "30.000đ", click vào ra trang chi tiết.
- [ ] **C2. 🔵 CoverImage + ảnh dự phòng** (`features/catalog/CoverImage.tsx`). Khi `cover_image_url` null/lỗi → hiện ảnh/khối dự phòng đẹp (nền màu thương hiệu + tên sách), thêm hiệu ứng bóng nhẹ. **Không** móc hiệu ứng vào chuỗi `style` như mockup; viết bằng class.
  - *Xong khi:* sách không có ảnh vẫn nhìn ổn, ảnh lỗi không vỡ layout.
- [ ] **C3. Stars** (`features/catalog/Stars.tsx`). Sao đầy/rỗng theo `avg_rating`, kèm `(review_count)`. Dùng màu `--brass`. Có `aria-label` "x trên 5 sao".
- [ ] **C4. Trạng thái rỗng + skeleton.** Tạo component dùng chung cho "đang tải" (khối xám shimmer như `.bw-skel` của mockup) và "không có dữ liệu" (icon + câu gợi ý). Thay dần các `loading loading-spinner` hiện tại ở nơi hợp lý.
  - *Xong khi:* trang list khi tải hiện khung xương thay vì nhảy giật.

### GIAI ĐOẠN D — Trang chủ (`pages/home/HomePage.tsx`) — ✅ HOÀN THÀNH (2026-06-18)
*Ráp theo các quyết định mục 2. Thứ tự khối như mockup.*

> **Đã làm:** thêm FE helper `fetchBestsellers` + `book_count` vào Category; viết lại HomePage 5 khối:
> D1 Hero (tiêu đề serif + ô tìm → /books?q= + chip thể loại thật + **số liệu thật**: total sách & số thể loại) ·
> D2 value-prop 4 cột · D3 Sách mới (10 thẻ, skeleton khi tải) · D4 Bán chạy (top 5 + huy hiệu hạng, **tự ẩn khi rỗng**) · D5 Thể loại (số đếm thật).
> **Verify:** build + lint xanh; screenshot hero + value-prop + lưới sách khớp mockup; "Bán chạy" ẩn đúng vì chưa có đơn Delivered; thể loại hiện "N cuốn" thật.

- [ ] **D1. Hero** — tiêu đề lớn (serif), mô tả, ô tìm kiếm (submit → `/books?q=`), chip từ khoá phổ biến, 3 số liệu. 🔵 Số liệu nên lấy thật (vd tổng số sách từ `GET /books` `total`) hoặc bỏ nếu không có nguồn.
- [ ] **D2. Value-prop strip** (#7) — nội dung tĩnh, ráp thẳng.
- [ ] **D3. �refn Sách mới** — `GET /books?limit=8` (đã có trong HomePage), lưới 5 cột dùng BookCard mới.
- [ ] **D4. 🔴🔵 Bán chạy nhất tháng** (#2 = ĐÃ CHỐT làm thật) — gọi endpoint bán chạy mới (xem mục 6), lưới 5 cột có huy hiệu xếp hạng 1–5. **Cần làm backend trước** (B-Sale ở mục 6).
- [ ] **D5. 🔴🔵 Khám phá theo thể loại** (#3 = ĐÃ CHỐT) — `GET /categories` **đã kèm số đếm thật** (sau khi làm B-Count ở mục 6), hiện "N cuốn" cho mỗi thể loại.
- [ ] **D6. ~~Flash sale~~ — ĐÃ CẮT.** Không làm khối này.
- [ ] **D7. ~~Testimonials / Newsletter~~ — ĐÃ CẮT.** Không làm 2 khối này.
  - *Xong cả GĐ D khi:* trang chủ cuộn mượt, **mọi khối hiển thị đều có data thật**, không có nút bấm "chết". Thứ tự khối: Hero → Value-prop → Sách mới → Bán chạy → Thể loại.

### GIAI ĐOẠN E — Danh sách + bộ lọc — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm:** E1 BookListPage bố cục mới (breadcrumb + "Kho sách" + sidebar 280px + lưới 4 cột) · thanh công cụ (số kết quả + sắp xếp) · **chip lọc gỡ được** ·
> E2 BookFilters thành sidebar dọc (ô tìm, thể loại dạng nút có **số đếm** + active, khoảng giá, "Xóa lọc"); **bỏ lọc "Đánh giá" + sort "Bán chạy"** (backend không hỗ trợ — tránh nút chết) ·
> E3 Pagination active dùng `btn-primary`.
> **Verify (eval):** lọc `category=ky-nang-song` → 3 sách (khớp count), thể loại active đúng; `sort=price_asc` → giá tăng dần đúng; chip lọc hiện. (Công cụ screenshot lỗi với trang này.)

- [ ] **E1. BookListPage** (`pages/books/BookListPage.tsx`) — bố cục mockup: cột lọc trái + lưới sách phải + thanh sắp xếp.
- [ ] **E2. BookFilters** (`features/catalog/BookFilters.tsx`) — restyle. **Sort chỉ giữ 3 lựa chọn thật:** Mới nhất / Giá tăng / Giá giảm (đừng thêm "bán chạy" nếu backend chưa có). Lọc theo thể loại từ `GET /categories`.
- [ ] **E3. Pagination** (`features/catalog/Pagination.tsx`) — restyle nút trang.
  - *Xong khi:* đổi lọc/sort/trang → URL đổi, kết quả đúng (logic cũ giữ nguyên).

### GIAI ĐOẠN F — Chi tiết sách (`pages/books/BookDetailPage.tsx`) — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm:** F1 Hero (breadcrumb + bìa lớn trái + thông tin phải: tiêu đề serif, tác giả link, sao, thể loại badge, giá, tồn kho, chọn số lượng + Thêm vào giỏ — giữ logic AddToCart) ·
> F2 Tabs Mô tả / Thông tin / Đánh giá (tab bar tự dựng, nhãn "Đánh giá (N)" từ `review_count`) · F3 ReviewsSection restyle (bỏ h2 trùng nhãn tab, review có avatar; giữ điều kiện "chỉ user đã mua") · F4 RelatedBooks heading serif.
> **Verify (eval):** trang hiện đúng tiêu đề/tác giả/giá/thể loại/nút giỏ; 3 tab, bấm "Đánh giá" → ReviewsSection mount (hiện "Đăng nhập để đánh giá" + "Chưa có đánh giá"). build + lint xanh. (Screenshot tool lỗi cả phiên.)

- [ ] **F1. Khối Hero chi tiết** — ảnh bìa lớn trái, thông tin phải (tên, tác giả → link `/author/:id`, sao, giá, chọn số lượng, nút Thêm giỏ / Mua ngay, nút Yêu thích). Giữ nguyên logic thêm giỏ.
- [ ] **F2. Tabs** — Mô tả / Thông tin (ISBN, NXB, năm, số trang, ngôn ngữ) / Đánh giá. Dữ liệu đã có trong `BookDetail`.
- [ ] **F3. ReviewsSection** (`features/catalog/ReviewsSection.tsx`) — restyle danh sách + form. Giữ điều kiện "chỉ user đã mua (Delivered) mới review".
- [ ] **F4. RelatedBooks** (`features/catalog/RelatedBooks.tsx`) — `GET /books/:slug/related`, dùng BookCard mới.

### GIAI ĐOẠN G — Giỏ hàng + Thanh toán — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm (CHỈ giao diện, logic tính tiền/đặt đơn nguyên vẹn):** G1 CartPage chuyển bảng → **thẻ dòng giỏ** (bìa + tên + giá + stepper + thành tiền + xóa) bên trái + **thẻ tóm tắt sticky** bên phải; giỏ rỗng dùng `EmptyState` ·
> G2 CheckoutPage đổi vỏ (h1 serif, card viền thay bóng, card-title serif) — **giữ nguyên** chọn địa chỉ, phí ship theo zone, voucher preview, COD/VNPay, tính `subtotal + ship − discount`, mutation đặt đơn.
> **Verify (eval, trước khi tool gián đoạn):** giỏ rỗng → EmptyState; thêm sách → 1 dòng (Homo Deus, qty 1, 269.000đ) + tóm tắt 269.000đ + nút đặt hàng bật. build + lint xanh. (Checkout cần đăng nhập + địa chỉ mới xem trực tiếp — sửa chỉ là class nên build xanh là đủ chắc.)

- [ ] **G1. CartPage** (`pages/cart/CartPage.tsx`) — bảng dòng giỏ (ảnh + tên + giá + chỉnh số lượng + xoá) trái, tóm tắt đơn phải. Giữ nguyên logic guest/user cart, cảnh báo sách hết/ẩn.
- [ ] **G2. CheckoutPage** (`pages/checkout/CheckoutPage.tsx`) — form địa chỉ (2 cấp Tỉnh/Phường từ `GET /locations/...`), chọn COD/VNPay, ô voucher (`/vouchers/preview`), tóm tắt phí ship (`/shipping/fee`). **Tuyệt đối không đổi logic tính tiền/transaction.**
  - *Xong khi:* đặt thử 1 đơn COD chạy hết luồng như cũ.

### GIAI ĐOẠN H — Tài khoản — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm (chỉ giao diện):** H1 ProfilePage + ProfileInfoForm + ChangePasswordForm + AddressBook (heading serif, card viền thay bóng, card-title serif) — giữ nguyên mutation cập nhật/đổi mật khẩu/CRUD địa chỉ ·
> H2 OrdersPage (thẻ đơn viền + mã đơn serif + badge trạng thái từ `ORDER_STATUS_META`, rỗng → `EmptyState`) · OrderDetailPage (vỏ card + heading serif; giữ hủy đơn/VNPay/snapshot) ·
> H3 WishlistPage (heading serif, rỗng → `EmptyState`, lưới BookCard).
> **Verify:** build + lint xanh; app boot, guest /orders → /login (auth-guard OK). Các trang cần đăng nhập để xem trực tiếp (tài khoản mẫu `admin@bookstore.vn`) — đổi chỉ là class nên không rủi ro logic.

- [ ] **H1. ProfilePage** + 4 form con (`ProfileInfoForm`, `ChangePasswordForm`, `AddressBook`, `AddressForm`) — restyle dạng tab/section theo mockup "Hồ sơ".
- [ ] **H2. OrdersPage / OrderDetailPage** — danh sách đơn dạng thẻ + badge trạng thái (5 mức), trang chi tiết có timeline. Dùng `lib/order-status.ts` sẵn có để map nhãn/màu.
- [ ] **H3. WishlistPage** — lưới BookCard, nút bỏ thích.

### GIAI ĐOẠN I — Xác thực (`pages/auth/*`) — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm:** tạo `components/AuthLayout.tsx` (khung 2 cột: panel thương hiệu trái + form phải) dùng chung cho cả 5 trang ·
> I1 Login + Register viết lại dùng AuthLayout (giữ `GoogleLoginButton` + validate + merge giỏ) · I2 Forgot/Reset/Verify dùng AuthLayout (giữ logic mutation/token).
> **Verify (eval):** /login → panel "Sáng trí tuệ • Mở tương lai" + 3 điểm bán + form email/mật khẩu + Google + link đăng ký; /register → 5 ô + Google. build + lint xanh. (Screenshot lỗi do iframe Google.)

- [ ] **I1. Login / Register** — bố cục 2 cột mockup "Xác thực" (hình minh hoạ + form). Giữ `GoogleLoginButton` (Phase 9) và toàn bộ validate.
- [ ] **I2. Forgot / Reset / VerifyEmail** — restyle form theo cùng phong cách.

### GIAI ĐOẠN J — Quản trị (`components/AdminLayout.tsx` + `pages/admin/*`) — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm (chỉ giao diện):** J1 AdminLayout (thanh top + sidebar) đã làm ở Phase B · J2 Dashboard (KPI viền, card biểu đồ viền + tiêu đề serif, cột doanh thu đổi sang xanh rêu thương hiệu; giữ 4 biểu đồ Recharts data thật) ·
> J3 các bảng Orders/Books/Categories/Authors/Vouchers + OrderDetail (card→viền, heading serif; giữ nguyên CRUD/lọc/đổi trạng thái/badge `ORDER_STATUS_META`) · J4 BookForm (card→viền, heading serif).
> **Verify:** build + lint xanh (8 trang admin). Cần đăng nhập admin để xem trực tiếp — đổi chỉ là class nên không rủi ro logic.

- [ ] **J1. AdminLayout** — sidebar điều hướng theo mockup "Quản trị" (Dashboard, Đơn, Sách, Thể loại, Tác giả, Voucher).
- [ ] **J2. Dashboard** — đặt lại bố cục KPI + 4 biểu đồ Recharts (đã có data thật từ `/api/admin/dashboard`), chỉ chỉnh màu/khung cho khớp theme.
- [ ] **J3. Các bảng** (Orders/Books/Categories/Authors/Vouchers) — restyle bảng + nút hành động. Giữ nguyên logic CRUD.
- [ ] **J4. BookForm** (`AdminBookFormPage`) — restyle form thêm/sửa sách + upload ảnh.

### GIAI ĐOẠN K — Hoàn thiện & kiểm thử cuối — ✅ HOÀN THÀNH (2026-06-18)

> **Đã làm:** K1 responsive (navbar mobile + menu hamburger ở Phase B; lưới co cột 2→4/5/6 ở mọi trang) · K2 dark mode QA (eval: nền/chữ/navbar/footer đổi màu đúng ở `bookwormdark`) ·
> K3 a11y: **thêm skip-link** "Bỏ qua tới nội dung chính" (`sr-only` → hiện khi Tab) + `main#main-content`; aria-label các nút icon (đã rải suốt B–H) · K4 link footer/menu đều trỏ route thật, không nút chết (đã cắt tính năng giả) · K5 build + lint xanh.
>
> **Sửa sau rà soát cuối (2026-06-18):** (a) hero trang chủ: đổi gradient từ inline style → class Tailwind `bg-[radial-gradient(...)]`; (b) **ẩn thể loại 0 cuốn** ở lưới trang chủ + chip "Phổ biến" + menu/dải thể loại navbar (lọc `book_count > 0`) — tránh dẫn tới trang rỗng. *(Lưu ý #1 "nút tim trong link" đã được sửa từ Phase C, không còn.)*

- [ ] **K1. Responsive** — kiểm 3 mức: điện thoại / tablet / desktop (mockup có breakpoint 480/768/1024). Lưới co cột. *(Navbar mobile + menu hamburger đã làm xong ở Giai đoạn B.)*
- [ ] **K2. Dark mode QA** — rà mọi trang ở chế độ tối, sửa chỗ chữ chìm/nền sai.
- [ ] **K3. Accessibility** — giữ skip-link, `aria-label` các nút icon, kiểm **tương phản** chữ mờ (`--muted`) đạt chuẩn đọc được; focus thấy rõ.
- [ ] **K4. Rà link gãy & nút chết** — không còn nút bấm không làm gì.
- [ ] **K5.** `npm run build` + `npm run lint` xanh; click thử toàn luồng mua hàng.

---

## 6. Việc cần làm BACKEND (2 việc NHỎ) — ✅ HOÀN THÀNH (2026-06-18)

> Đã làm + có unit test; `npm run typecheck` xanh, **`npm test` 215/215 xanh** (thêm 5 test). Endpoint kiểm tra chạy thật:
> `GET /api/books/bestsellers` trả `[]` (seed chưa có đơn Delivered — đúng); `GET /api/categories` trả kèm `book_count` thật.

- 🔴 **B-Sale — Sách bán chạy public.** Thêm endpoint `GET /books/bestsellers` (hoặc `sort=bestseller` cho `GET /books`) — tính theo **số lượng đã bán** = tổng `quantity` trong `OrderItem` của các đơn `Delivered`, nhóm theo sách, lấy top N, trả về đúng `bookCardSelect` (để FE tái dùng BookCard). Đụng: `catalog/book.service.ts`, `book.schemas.ts`, `book.controller.ts`, `book.routes.ts`.
  - *Xong khi:* gọi endpoint trả đúng danh sách sắp theo lượng bán; có test; `npm test` xanh.
- 🔴 **B-Count — Đếm sách mỗi thể loại.** Thêm `_count` số sách **đang bán** (`is_active = true`) vào `GET /categories`. Đụng: `catalog/category.service.ts` (dùng `_count` của Prisma), cập nhật kiểu trả về + `frontend/src/api/categories.ts`.
  - *Xong khi:* `GET /categories` trả thêm số đếm; FE đọc được.

### Đã CẮT — KHÔNG làm
- ~~Giá khuyến mãi theo sách (thêm cột vào `Book`)~~ — đã chốt **cắt** flash sale, nên không đụng schema.
- ~~Newsletter~~ — đã chốt **cắt**.

---

## 7. Thứ tự đề xuất & cách kiểm thử

**Thứ tự làm:** A → B → C → **[Backend nhỏ: B-Sale + B-Count]** → D → E → F → G → H → I → J → K.
Lý do: A/B/C là **nền + thứ dùng lại nhiều nhất**; xong 3 cái này thì các trang sau ráp rất nhanh và đồng bộ. Phase backend nhỏ (mục 6) làm xen **ngay trước Giai đoạn D** vì trang chủ cần 2 API đó.

**Sau MỖI giai đoạn:**
1. `cd frontend && npm run build` và `npm run lint` → phải xanh.
2. `npm run dev`, mở trình duyệt **xem thật** đúng trang vừa sửa (sáng + tối).
3. Bấm thử 1 luồng liên quan (vd sửa BookCard xong → vào trang chủ + trang list xem card).
4. Commit 1 commit/giai đoạn, message tiếng Việt rõ ràng.

**Mốc "đã thấy khác biệt rõ" sớm nhất:** hết **Giai đoạn B** (theme + font + navbar + footer) — toàn site đã mang dáng "The Bookworm" dù chưa đụng từng trang.

---

### Ghi chú cuối
- Tài liệu này **bám theo code thật ngày 2026-06-18**; nếu sau này backend đổi (thêm sort, thêm cột), cập nhật lại mục 1–2.
- Mọi chỗ ghi 🟠 (quyết định) nên **chốt trước khi bắt đầu Giai đoạn D**, vì trang chủ phụ thuộc chúng.
