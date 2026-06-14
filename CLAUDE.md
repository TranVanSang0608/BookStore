# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Bối cảnh dự án

Đồ án sinh viên: **Website bán sách trực tuyến** (sách giấy, B2C, tiếng Việt, thanh toán COD + VNPay sandbox). Toàn bộ quyết định kiến trúc nằm trong **[THIET-KE.md](THIET-KE.md)** ở root repo — đây là source of truth, đọc nó trước khi code bất kỳ module nào.

**Trạng thái (2026-06-14):** **Phase 5 HOÀN THÀNH → 🛑 CHECKPOINT: CORE end-to-end XONG** (chi tiết + khái niệm ôn tập: [DEV-LOG.md](DEV-LOG.md)). Payment VNPay sandbox đầy đủ: BE `lib/vnpay.ts` (HMAC-SHA512 build URL + verify chữ ký, bám demo VNPay D47), module `payment/` — `POST /vnpay/create` (auth), `GET /vnpay/return` (public, 302 về FE) + `GET /vnpay/ipn` (public, RspCode) dùng chung `reconcileVnpayPayment` idempotent (đối chiếu amount từ DB, conditional update Pending→Paid); createOrder branch gateway theo payment_method + sinh txn_ref (D46/D48); cron bỏ qua đơn đã Paid (D49). FE: CheckoutPage chọn COD/VNPay (vnpay → redirect cổng), OrderDetailPage hiện trạng thái thanh toán + nút retry + banner `?payment=`. 110 unit test xanh; verify callback đã ký trên DB thật (Paid + idempotent + tamper→97). **Credentials sandbox đã điền trong `backend/.env` (gitignored)**; luồng UI VNPay thật (thẻ NCB + OTP) verify thủ công khi bảo vệ (preview không ra domain ngoài được); IPN thật cần ngrok/deploy (D18). **7 module CORE chạy thông** — quyết định checkpoint: nộp+polish hay tiếp NICE tier.

## Lệnh dev & test

Trong `backend/`: `npm run dev` (port 3000) | `npm run typecheck` | `npm run build` + `npm start` | `npm test` (Jest) | `npx prisma migrate dev --name <tên>` | `npx prisma db seed` (idempotent) | `npx prisma generate` | `npx tsx scripts/smoke-cloudinary.ts`

Trong `frontend/`: `npm run dev` (port 5173) | `npm run build` (tsc + vite build)

Preview: `.claude/launch.json` đã khai báo 2 server tên `backend` / `frontend`. Đổi schema Prisma xong PHẢI chạy `npx prisma generate` (client nằm ở `backend/src/generated/`, gitignored, tự generate lại khi `npm install` nhờ postinstall).

**Người dùng là sinh viên phải bảo vệ đồ án trước hội đồng** — họ cần HIỂU mọi đoạn code được tạo ra:
- Làm lát nhỏ, dùng plan mode trước khi code feature lớn, giải thích bằng tiếng Việt sau mỗi feature.
- Ưu tiên code rõ ràng, dễ đọc hơn là pattern "thông minh". Tránh abstraction không cần thiết.
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
