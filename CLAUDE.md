# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Bối cảnh dự án

Đồ án sinh viên: **Website bán sách trực tuyến** (sách giấy, B2C, tiếng Việt, thanh toán COD + VNPay sandbox). Toàn bộ quyết định kiến trúc nằm trong **[THIET-KE.md](THIET-KE.md)** ở root repo — đây là source of truth, đọc nó trước khi code bất kỳ module nào.

**Trạng thái (2026-06-15):** **Phase 6 HOÀN THÀNH** — tính năng NICE đầu tiên sau checkpoint: **Email service** (chi tiết + khái niệm ôn tập: [DEV-LOG.md](DEV-LOG.md)). Dùng **Resend** (pivot D16→D50): `lib/mailer.ts` là "đường ống" duy nhất (`sendMail` ném lỗi / `sendMailSafe` nuốt lỗi — fail-soft, luôn fire-and-forget ngoài transaction, D51), `lib/email-templates.ts` ráp HTML inline-style. 3 luồng: (1) **email xác nhận đơn** móc sau `createOrder` (`modules/notification/order-email.ts`); (2) **xác thực email** khi đăng ký + `email_verified` (banner nhắc, không chặn mua hàng — D53); (3) **quên/đặt lại mật khẩu** (anti-enumeration). Token verify/reset: 1 bảng `EmailToken` lưu HASH, dùng-một-lần, compare-and-set (D52); `lib/email-token.ts`. FE: trang `/verify-email` `/forgot-password` `/reset-password` + banner Layout + link login. **137 unit test BE xanh**, build+lint FE xanh, smoke `scripts/smoke-mailer.ts` gửi mail thật OK. **Luồng email THẬT (mở mail, bấm link verify/reset) verify thủ công khi bảo vệ** — như VNPay, preview không click hộ link trong mail. `RESEND_API_KEY` đã điền trong `backend/.env` (gitignored). **Trước đó (Phase 5):** 7 module CORE chạy thông end-to-end (Auth→Catalog→Cart→Checkout→Order→Payment COD+VNPay).

## Lệnh dev & test

Trong `backend/`: `npm run dev` (port 3000) | `npm run typecheck` | `npm run build` + `npm start` | `npm test` (Jest) | `npx prisma migrate dev --name <tên>` | `npx prisma db seed` (idempotent) | `npx prisma generate` | `npx tsx scripts/smoke-cloudinary.ts`

Trong `frontend/`: `npm run dev` (port 5173) | `npm run build` (tsc + vite build)

Preview: `.claude/launch.json` đã khai báo 2 server tên `backend` / `frontend`. Đổi schema Prisma xong PHẢI chạy `npx prisma generate` (client nằm ở `backend/src/generated/`, gitignored, tự generate lại khi `npm install` nhờ postinstall).

## Quy tắc giải thích & kiểm tra hiểu (BẮT BUỘC — ưu tiên ngang việc code đúng)

**Người dùng là sinh viên MỚI học lập trình, sắp bảo vệ đồ án trước hội đồng.** Họ phải TỰ giải thích được code của chính mình; hội đồng sẽ hỏi "chỗ này chạy thế nào, sao em làm vậy". Rủi ro lớn nhất hiện tại: **code chạy nhưng user không hiểu nó hoạt động ra sao** vì giải thích trước giờ quá dài + đầy thuật ngữ nên user bỏ qua. Mọi quy tắc dưới đây để bịt lỗ hổng đó. Mục tiêu của đồ án là USER hiểu, không phải AI hiểu thay.

### 1. Giải thích ở tầm người mới — KHÔNG phải dev senior
- Mặc định giải thích bằng tiếng Việt như cho **người mới học**, KHÔNG dùng thuật ngữ. Thuật ngữ bắt buộc dùng thì kèm ngay 1 ví dụ đời thường.
- **ĐỪNG dán lại code để "giải thích".** Giải thích Ý TƯỞNG và LUỒNG chạy (cái gì gọi cái gì, dữ liệu đi đâu), không đọc lại cú pháp.
- Ngắn gọn, chia đoạn nhỏ. Một bài giải thích dài = user sẽ bỏ qua (đó là điều đang xảy ra).

### 2. Giải thích theo "độ cao", không từng dòng
Sau mỗi phase/feature, mặc định đưa:
- **Bản đồ file:** mỗi file MỘT câu — nó làm gì.
- **Luồng dữ liệu:** một thao tác (vd "bấm Đặt hàng") chạm qua những file nào, theo thứ tự, từ FE → API → backend → DB và quay lại.
- Chi tiết từng dòng CHỈ khi user hỏi cụ thể về dòng đó.

### 3. CỔNG HIỂU sau mỗi phase (BLOCKING — không tự ý bỏ qua)
Kết thúc mỗi phase, TRƯỚC khi sang phase mới:
- AI **tự đặt cho user 3 câu hỏi** kiểm tra hiểu (về luồng chạy + lý do thiết kế, KHÔNG hỏi cú pháp).
- User trả lời → AI chấm, chỉ rõ chỗ sai/thiếu, giải thích lại đúng phần đó.
- **Code chạy được KHÔNG có nghĩa là phase xong.** Phase chỉ xong khi user trả lời được. Không tự nhảy sang phase mới chỉ vì test xanh.

### 4. Sổ thuật ngữ — `THUAT-NGU.md` (ở root repo)
- Mỗi khi xuất hiện thuật ngữ mới (middleware, endpoint, ORM, transaction, JWT, idempotent...), thêm 1 dòng vào `THUAT-NGU.md`: định nghĩa **siêu đơn giản (1–2 câu) + ví dụ đời thường**.
- Không nhồi định nghĩa hàn lâm. Đây là sổ tay để user tra nhanh, không phải từ điển.

### 5. Trace 1 feature xuyên suốt khi user muốn "hình dung cách chạy"
Dẫn user đi qua từng file theo đúng thứ tự một thao tác chạm tới (vd "thêm sách vào giỏ": click BookCard → `api/cart.ts` → `POST /api/cart` → `cart/controller.ts` → `cart/service.ts` → Prisma → DB → trả về cập nhật badge). Đây là cách xây "hình dung cách hoạt động" nhanh nhất.

### Vẫn giữ (quy trình đang đúng)
- Plan kỹ + chia phase + làm lát nhỏ, dùng plan mode trước feature lớn — quy trình này TỐT, chỉ thiếu cổng hiểu ở mục 3.
- Ưu tiên code rõ ràng, dễ đọc hơn pattern "thông minh"; tránh abstraction không cần thiết.
- Với business logic phức tạp (transaction, VNPay signature, cart merge), thêm comment tiếng Việt giải thích.
- Ghi DEV-LOG.md mỗi phase để user ôn lại khi bảo vệ.

## Tech stack đã chốt

- **Backend:** Node.js + Express 5 (REST), TypeScript, Prisma 7 + PostgreSQL (Neon — lưu ý setup Prisma 7 khác tutorial, xem D31), Zod validation, JWT (localStorage)
- **Frontend:** React 19 + Vite + React Router 7 (SPA — KHÔNG Next.js), Tailwind 4 (CSS-first, không có tailwind.config.js — D33) + DaisyUI 5, React Query
- **Khác:** Cloudinary (ảnh — upload qua backend, KHÔNG Firebase, xem Decision D15), Nodemailer + Gmail SMTP, VNPay sandbox, Jest unit test, Winston logging
- Monorepo 1 repo, 2 folder: `backend/` + `frontend/`

## Quy tắc kiến trúc bắt buộc

### 1. Phân tầng CORE / NICE-TO-HAVE
**ZERO việc tier NICE cho tới khi 7 module CORE chạy end-to-end** (user đặt đơn được, admin xác nhận, VNPay return success). CORE = Auth, User+Address, Catalog, Cart, Checkout, Order, Payment. NICE = OAuth, email, wishlist, voucher, review, recommend, dashboard chart, tsvector. Không thêm feature ngoài scope đã chốt trong THIET-KE.md mục 2.

### 2. SNAPSHOT principle
Order/OrderItem **không được phụ thuộc** dữ liệu có thể đổi: OrderItem snapshot `book_title`, `price_at_order`, `book_author_name`, `cover_image_url_snapshot`; Order snapshot toàn bộ địa chỉ giao hàng (KHÔNG FK về Address) và `voucher_code` + `discount_amount`. Lý do: lịch sử đơn phải đọc đúng kể cả khi data gốc bị sửa/xóa.

### 3. TRANSACTION principle
Mọi thao tác chạm `Book.stock_quantity` hoặc `Voucher.used_count` PHẢI nằm trong Prisma `$transaction` (createOrder trừ stock, cancelOrder hoàn stock — xem THIET-KE.md mục 5.3 cho thứ tự các bước). Stock trừ ngay khi tạo Order (Pending), hoàn khi Cancelled. Cron `node-cron` auto-cancel đơn Pending > 24h.

### 4. Cấu trúc code
Backend theo **feature-based modules** (`src/modules/<feature>/` với routes.ts, controller.ts, service.ts, schemas.ts), middleware tập trung (auth, adminOnly, error handler, Zod validate), lib singleton (prisma, cloudinary, vnpay, jwt). Frontend theo `pages/` + `features/` + `api/` + `hooks/`. Cây thư mục đầy đủ trong THIET-KE.md mục 6.

### 5. Các ràng buộc nghiệp vụ chính
- Order status đúng 5 mức: Pending → Confirmed → Shipping → Delivered → Cancelled
- Review chỉ cho user đã có Order status=Delivered chứa book đó (verified purchase)
- Guest cart trong localStorage, merge vào DB cart khi login (resolve trùng bằng `max(qty)` per book_id)
- Ship tính theo zone Tỉnh + free ship trên ngưỡng; địa chỉ **2 cấp** Tỉnh/Phường-Xã (34 tỉnh sau sáp nhập 2025 — D32), data tự host trong bảng Province/Ward, seed từ file đóng băng `backend/prisma/data/vn-locations.json` (KHÔNG để FE gọi provinces.open-api.vn trực tiếp)
- 1 role admin duy nhất qua `User.role = 'admin'`; Category flat 1 cấp, Book n-n Category; Author là entity riêng
- Tiền tệ VND hiển thị "30.000đ", giá đã gồm VAT; UI chỉ tiếng Việt
- Bảo mật: Helmet, CORS theo origin FE, `express-rate-limit` cho `/api/auth/*`, KHÔNG dùng `dangerouslySetInnerHTML`

## Khi thay đổi thiết kế

Mọi quyết định kiến trúc mới hoặc pivot phải được ghi vào Decision log (THIET-KE.md mục 10) kèm lý do, theo format các decision D1–D28 hiện có.
