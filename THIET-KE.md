# Đồ án: Website Bán Sách Trực Tuyến — Tài liệu Thiết kế

> Tổng hợp toàn bộ quyết định kiến trúc sau 5 round phỏng vấn + 1 round refactor scope.
> Tạo: 2026-06-04

---

## Mục lục

1. [Mục tiêu & Kết quả dự kiến](#1-mục-tiêu--kết-quả-dự-kiến)
2. [Scope đã chốt](#2-scope-đã-chốt)
3. [Tech stack](#3-tech-stack)
4. [Phân tầng module: CORE vs NICE-TO-HAVE](#4-phân-tầng-module-core-vs-nice-to-have)
5. [Data model — 19 bảng](#5-data-model--19-bảng)
6. [Code structure](#6-code-structure)
7. [Cross-cutting concerns](#7-cross-cutting-concerns)
8. [Implementation phases](#8-implementation-phases)
9. [Risks & mitigations](#9-risks--mitigations)
10. [Decision log](#10-decision-log)
11. [Câu hỏi mở / Future enhancements](#11-câu-hỏi-mở--future-enhancements)

---

## 1. Mục tiêu & Kết quả dự kiến

**Mục tiêu:** Xây dựng website bán sách trực tuyến cho phép người dùng tìm kiếm, xem thông tin và đặt mua sách thuận tiện.

**Kết quả dự kiến:**

- **Phần User**: Trang chủ sách nổi bật, search theo tên/tác giả/thể loại, xem chi tiết sách, lọc theo danh mục, thêm giỏ hàng, đặt hàng, đánh giá & bình luận.
- **Phần Admin**: Quản lý sách (CRUD), quản lý danh mục, quản lý đơn hàng, thống kê đơn hàng cơ bản.

**Deadline:** > 1 tháng tính từ đầu June 2026.

**Approach:** MVP-first phân tầng — CORE 7 modules trước, NICE-TO-HAVE sau khi CORE chạy end-to-end.

---

## 2. Scope đã chốt

| Aspect | Quyết định |
|---|---|
| Sản phẩm | **Sách giấy** (physical, có ship, có stock — không ebook) |
| Khách hàng | B2C, **guest browse + cart OK**, checkout bắt buộc login |
| Thanh toán | COD + **VNPay sandbox** (chỉ VNPay, không MoMo) |
| Ship | Zone-based theo Tỉnh + **free ship trên ngưỡng** (địa chỉ **2 cấp** Tỉnh/Phường-Xã — xem D32) |
| Order status | **5 mức**: Pending → Confirmed → Shipping → Delivered → Cancelled |
| Review | **Verified purchase only** — chỉ user đã có Order với status=Delivered cho book đó |
| Auth | Email/password (CORE) + Google OAuth (NICE) + verify email (NICE) + forgot password (NICE) |
| Địa chỉ | **Nhiều địa chỉ saved** per user, có `is_default` flag |
| Admin role | **1 role admin** toàn quyền (`User.role = 'admin'`) |
| Author | **Entity riêng**, Book → Author (n-1), có trang `/author/:id` |
| Category | **Flat 1 cấp**, Book **n-n** Category qua junction |

---

## 3. Tech stack

| Layer | Stack | Note |
|---|---|---|
| **Backend** | Node.js + Express | REST API style |
| **ORM** | Prisma | Type-safe, migrations sẵn |
| **Database** | PostgreSQL (cloud) | Render/Neon/Railway free tier |
| **Validation** | Zod | Schema dùng được cả FE + BE |
| **Frontend** | React 19 + Vite + React Router 7 | SPA, không Next.js (bản thực tế khi init — D33) |
| **UI** | Tailwind CSS + DaisyUI hoặc Flowbite | Component sẵn |
| **Server state** | React Query (đề xuất) | Cache + sync |
| **Auth** | JWT (localStorage) + Passport.js (Google OAuth) | Defense XSS: React default escape |
| **File storage** | Cloudinary | Free 25GB, không cần thẻ. Upload từ backend qua Node SDK, có sẵn resize/optimize ảnh |
| **Email** | Nodemailer + Gmail SMTP | App password (bật 2FA) |
| **Payment** | VNPay sandbox | Cần callback URL công khai |
| **Deploy** | Render/Railway (BE) + Postgres cloud | Free tier đủ cho đồ án |
| **Test** | Jest (unit cho business logic) | Integration chỉ nếu dư |
| **Search** | WHERE ILIKE + filter combo | tsvector nếu cần ở NICE |

---

## 4. Phân tầng module: CORE vs NICE-TO-HAVE

### Quy tắc cứng

> **ZERO tier-2 (NICE) work cho tới khi tier-1 (CORE) chạy end-to-end.**
> End-to-end = user đặt đơn được, admin xác nhận, VNPay return success.

### CORE (7 modules — đồ án "đứng được" nếu chỉ có nhóm này)

| # | Module | Mô tả |
|---|---|---|
| 1 | **Auth** | Email/password only. Đăng ký, đăng nhập, JWT, middleware verify, role check |
| 2 | **User + Address** | Profile + address book (multi, có default) |
| 3 | **Catalog** | Book + Author + Category CRUD (admin), list + detail (user), search ILIKE + filter (price/category/sort) |
| 4 | **Cart** | Guest cart trong localStorage + login merge vào DB cart |
| 5 | **Checkout** | Chọn địa chỉ, tính ship zone, tổng tiền (chưa voucher) |
| 6 | **Order** | Tạo Order (transaction trừ stock), lịch sử user, chi tiết, hủy đơn (transaction hoàn stock), Admin CRUD đơn giản |
| 7 | **Payment** | Tạo Payment record cho COD, VNPay sandbox integration + callback |

### NICE-TO-HAVE (chỉ động vào sau checkpoint Phase 5)

- Google OAuth
- Email service (forgot password + verify email + order confirmation)
- Wishlist
- Voucher + VoucherUsage
- Review (verified purchase)
- Recommend (cùng category + cùng author, KHÔNG collaborative filtering)
- Admin dashboard với chart (doanh thu, top sản phẩm)
- PostgreSQL full-text search (tsvector)
- Integration tests cho checkout + payment

---

## 5. Data model — 19 bảng

### 5.1 Bảng theo tier

#### CORE entities (14 bảng)

| # | Bảng | Vai trò chính |
|---|---|---|
| 1 | **User** | `id, email, password_hash (nullable cho OAuth sau), name, phone, role ('user'\|'admin'), created_at` |
| 2 | **Address** | n-1 User. `province_code, ward_code, province_name, ward_name, street_detail, recipient_name, phone, is_default` (2 cấp — D32) |
| 3 | **Author** | `id, name, bio, photo_url` |
| 4 | **Category** | `id, name, slug, description` — flat 1 cấp |
| 5 | **Book** | n-1 Author. `title, slug, description, price, stock_quantity, cover_image_url, isbn, publisher, published_year, language, pages, is_active` |
| 6 | **BookCategory** | Junction (book_id, category_id) — composite PK, n-n |
| 7 | **Cart** | 1-1 User |
| 8 | **CartItem** | n-1 Cart, n-1 Book. `quantity` |
| 9 | **Order** | n-1 User. `order_code, status, subtotal, shipping_fee, discount_amount, total, note, placed_at, ...` + snapshot fields |
| 10 | **OrderItem** | n-1 Order. Snapshot data của Book + price |
| 11 | **Payment** | n-1 Order. `gateway ('vnpay'\|'cod'), txn_ref, amount, status, gateway_response (JSON), paid_at, attempted_at` |
| 12 | **ShippingZone** | Config table. `province_code, fee, free_threshold` |
| 13 | **Province** | Địa giới tự host (D32). `code (PK), name` — đóng băng từ provinces.open-api.vn v2 |
| 14 | **Ward** | n-1 Province. `code (PK), name, province_code` — 3.321 phường/xã |

#### NICE entities (5 bảng)

| # | Bảng | Vai trò |
|---|---|---|
| 13 | **Wishlist** | n-1 User, n-1 Book. Unique (user_id, book_id) |
| 14 | **Voucher** | `code, discount_type, discount_value, min_order, max_discount, expire_at, usage_limit, used_count, per_user_limit, is_active` |
| 15 | **VoucherUsage** | Log per (voucher, user, order). Cho per_user_limit |
| 16 | **Review** | n-1 User, n-1 Book, n-1 Order. `rating (1-5), comment`. Unique (user_id, book_id) |
| 17 | **RefreshToken** | Optional, nếu cần JWT refresh sau này |

---

### 5.2 SNAPSHOT principle (CRITICAL)

> Order/OrderItem **KHÔNG được phụ thuộc** dữ liệu có thể thay đổi (Book price, Address text, Voucher value).

**OrderItem** chứa snapshot:
- `book_title` (snapshot của Book.title)
- `book_author_name` (snapshot của Author.name)
- `price_at_order` (snapshot của Book.price)
- `cover_image_url_snapshot` (URL ảnh tại thời điểm đặt)
- Vẫn giữ `book_id` để link nếu Book còn tồn tại

**Order** chứa snapshot địa chỉ:
- `shipping_recipient_name`
- `shipping_phone`
- `shipping_province_name`, `shipping_ward_name`
- `shipping_street`
- **KHÔNG FK về Address** — vì user có thể xóa address sau

**Order** chứa snapshot voucher:
- `voucher_code` (string snapshot)
- `discount_amount` (giá trị đã áp dụng)
- Có FK `voucher_id` để analytics nhưng KHÔNG load từ đó khi hiển thị

**Why:** Đảm bảo lịch sử đơn cũ luôn đọc được đúng dữ liệu tại thời điểm mua, kể cả khi data gốc bị xóa/sửa.

---

### 5.3 TRANSACTION principle (CRITICAL)

Mọi op chạm vào `Book.stock` hoặc `Voucher.used_count` PHẢI atomic qua Prisma `$transaction`.

**`createOrder()`** — tất cả trong 1 transaction:
1. INSERT `Order` (status=Pending)
2. INSERT N `OrderItem` (snapshot data)
3. UPDATE `Book.stock_quantity -= quantity` cho từng item
4. (Nếu có voucher) UPDATE `Voucher.used_count += 1`
5. (Nếu có voucher) INSERT `VoucherUsage`
6. INSERT `Payment` (status=Pending)

**`cancelOrder()`** — tất cả trong 1 transaction:
1. UPDATE `Order.status = 'Cancelled'`, set `cancelled_at`
2. UPDATE `Book.stock_quantity += quantity` cho từng OrderItem
3. (Nếu có voucher) UPDATE `Voucher.used_count -= 1`
4. UPDATE `Payment.status = 'Cancelled'` nếu chưa paid

**Why:** Tránh race condition (oversell khi 2 user đặt cùng lúc) hoặc partial state (đơn tạo nhưng stock không trừ).

**Stock timing:** Trừ ngay khi tạo Order (Pending), hoàn khi Cancelled.

**Anti-zombie order:** Cron job `node-cron` auto-cancel Order Pending > 24h (để hoàn stock cho đơn không bao giờ thanh toán).

---

### 5.4 ERD (Mermaid)

```mermaid
erDiagram
    USER ||--o{ ADDRESS : "có nhiều"
    USER ||--|| CART : "có 1"
    USER ||--o{ ORDER : "đặt"
    USER ||--o{ WISHLIST : "yêu thích"
    USER ||--o{ REVIEW : "viết"
    USER ||--o{ VOUCHERUSAGE : "dùng"

    CART ||--o{ CARTITEM : "chứa"
    CARTITEM }o--|| BOOK : "ref"

    AUTHOR ||--o{ BOOK : "viết"
    BOOK }o--o{ CATEGORY : "thuộc (via BookCategory)"

    ORDER ||--o{ ORDERITEM : "chứa"
    ORDERITEM }o--|| BOOK : "ref (snapshot)"
    ORDER ||--o{ PAYMENT : "có nhiều attempt"
    ORDER }o--o| VOUCHER : "áp dụng (snapshot)"

    VOUCHER ||--o{ VOUCHERUSAGE : "log"

    WISHLIST }o--|| BOOK : "đánh dấu"
    REVIEW }o--|| BOOK : "đánh giá"
    REVIEW }o--|| ORDER : "verify (Delivered)"

    SHIPPINGZONE {
        string province_code
        decimal fee
        decimal free_threshold
    }
```

---

## 6. Code structure

### Backend (feature-based modules)

```
backend/
├── prisma/
│   ├── schema.prisma           # 19 bảng (CORE 14 trước, gồm Province/Ward — D32)
│   ├── migrations/
│   ├── data/                   # vn-locations.json — địa giới đóng băng (D32)
│   └── seed.ts                 # seed địa giới + ShippingZone + admin + catalog mẫu
├── src/
│   ├── modules/
│   │   ├── auth/               # routes.ts, controller.ts, service.ts, schemas.ts
│   │   ├── user/
│   │   ├── catalog/            # book, author, category gộp 1 module
│   │   ├── cart/
│   │   ├── wishlist/           # NICE
│   │   ├── checkout/
│   │   ├── order/
│   │   ├── payment/            # VNPay integration
│   │   ├── voucher/            # NICE
│   │   ├── review/             # NICE
│   │   ├── notification/       # NICE — email service
│   │   ├── shipping/           # zone + calc
│   │   └── admin/              # admin routes (composed từ các module trên)
│   ├── middleware/
│   │   ├── auth.ts             # verify JWT
│   │   ├── adminOnly.ts
│   │   ├── error.ts            # centralized error handler
│   │   └── validate.ts         # Zod schema runner
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── cloudinary.ts       # Cloudinary SDK config + upload helper
│   │   ├── nodemailer.ts       # NICE
│   │   ├── vnpay.ts            # signature + URL builder
│   │   ├── jwt.ts
│   │   └── logger.ts           # Winston
│   ├── utils/
│   ├── tests/                  # unit cho service layer
│   ├── jobs/                   # node-cron jobs (auto-cancel)
│   ├── app.ts                  # Express app config
│   └── server.ts               # entry point
├── .env.example
├── package.json
└── tsconfig.json (nếu dùng TypeScript)
```

### Frontend (React SPA)

```
frontend/
├── src/
│   ├── pages/
│   │   ├── home/
│   │   ├── books/              # list + filter
│   │   ├── book-detail/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── orders/             # lịch sử đơn
│   │   ├── profile/
│   │   ├── wishlist/           # NICE
│   │   └── admin/              # admin pages riêng
│   ├── components/             # UI components shared
│   ├── features/               # logic theo feature (cart, auth context...)
│   ├── api/                    # axios instance + typed endpoints
│   ├── hooks/                  # useAuth, useCart, ...
│   ├── lib/                    # zod schemas (share rules với BE)
│   ├── store/                  # auth context, cart context
│   ├── routes/
│   └── main.tsx
├── .env                        # chỉ biến VITE_* (public, không secret)
├── package.json
└── vite.config.ts              # Tailwind 4 là Vite plugin — KHÔNG có tailwind.config.js (D33)
```

---

## 7. Cross-cutting concerns

| Concern | Solution | Tier |
|---|---|---|
| Validation | **Zod** schemas, dùng cả FE + BE | CORE |
| Error handling | Centralized middleware, format JSON nhất quán | CORE |
| Auth (CORE) | JWT trong localStorage, `Authorization: Bearer ...` | CORE |
| Auth defense | React default escape XSS, KHÔNG `dangerouslySetInnerHTML`, có CSP header | CORE |
| CORS | Express CORS với origin của FE production | CORE |
| Security headers | Helmet middleware | CORE |
| Rate limiting | `express-rate-limit` cho `/api/auth/*` (chống brute-force) | CORE |
| Logging | Winston ra file + console (rotation theo ngày) | CORE |
| Cron jobs | `node-cron` auto-cancel Pending > 24h, hoàn stock | CORE |
| Image upload | Multer + Cloudinary. Max 2MB, .jpg/.png/.webp | CORE |
| Currency | VND, hiển thị "30.000đ" | CORE |
| VAT | Giá đã bao gồm VAT (không tính riêng) | CORE |
| Language | Chỉ tiếng Việt | CORE |
| Test | Jest unit cho service layer (voucher calc, stock, ship calc, total) | CORE |
| Database transaction | Prisma `$transaction` cho mọi op chạm stock/voucher | CORE |
| Integration test | Supertest cho checkout + payment | NICE |
| Email | Nodemailer + Gmail SMTP (app password) | NICE |
| Full-text search | PostgreSQL tsvector | NICE |
| Google OAuth | Passport.js Google strategy | NICE |

---

## 8. Implementation phases

| Phase | Tier | Nội dung | Days |
|---|---|---|---|
| **0** | Setup | Backend init (Express+Prisma+Zod), Frontend init (Vite+React+Tailwind), env, Cloudinary account, VNPay sandbox account, prisma/schema.prisma CORE | **2** |
| **1** | CORE | Auth (email/pwd) + User profile + Address book | **3** |
| **2** | CORE | Catalog: Book + Author + Category CRUD + Search/Filter | **4** |
| **3** | CORE | Cart (guest localStorage + login merge) + Checkout | **4** |
| **4** | CORE | Order (transactional create/cancel) + Admin CRUD đơn giản | **3** |
| **5** | CORE | Payment VNPay sandbox + callback + Payment table | **4** |
| **🛑 CHECKPOINT** | — | **Core end-to-end. Quyết định: nộp ngay (polish) HAY tiếp NICE?** | — |
| **6** | NICE | Email service (forgot pwd + verify email + order confirm) | 2 |
| **7** | NICE | Voucher + VoucherUsage | 2 |
| **8** | NICE | Wishlist + Review + Recommend | 3 |
| **9** | NICE | Google OAuth + Admin dashboard chart | 3 |
| **10** | All | Polish (UI, edge cases) + deploy + README | 3 |

**Tổng:**
- **Tối thiểu** (CORE + polish): ~**25 ngày** với 5-7 ngày buffer
- **Tối đa** (full NICE): ~**40 ngày** — dễ trượt, cần thận trọng

**Nguyên tắc checkpoint:** Nếu tới checkpoint đã 25+ ngày, dừng addon, qua polish, nộp đúng hạn với 7 module mượt > 14 module dở.

---

## 9. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Scope creep**: thêm feature giữa chừng → trễ deadline | 🔴 High | Phân tier rõ ràng. ZERO tier-2 trước khi tier-1 chạy end-to-end |
| **VNPay callback** cần URL công khai, debug sandbox phức tạp | 🔴 High | Dùng ngrok khi dev local. Phase 5 dành đủ 4 ngày, có buffer |
| **Cart merge logic** phức tạp hơn vẻ ngoài (item trùng, qty conflict) | 🟡 Medium | Viết unit test riêng. Logic: `merge(guest, db)` resolve qua `max(qty)` per book_id |
| **JWT localStorage** dễ XSS | 🟡 Medium | React default escape. KHÔNG `dangerouslySetInnerHTML`. CSP header. **Chuẩn bị defense cho hội đồng** |
| **Cloudinary** học mới (SDK, upload flow) | 🟢 Low | SDK Node đơn giản, docs tốt, setup < 1 buổi trong Phase 0 |
| **Prisma migration** trên cloud Postgres có thể fail | 🟡 Medium | Test migration trên local DB trước. Backup trước migration production |
| **Lịch học/thi** ăn buffer | 🟡 Medium | Estimate đã có buffer 20%. Checkpoint sau Phase 5 cho quyết định cứu nguy |
| **OAuth setup** (nếu vào NICE) tốn config Google Cloud | 🟢 Low | NICE, có thể bỏ. Hoặc làm sau cùng |
| **Email service** Gmail block app password mới | 🟢 Low | Có thể fallback Resend / SendGrid |
| **Race condition** stock | 🟢 Low | Prisma `$transaction` đã handle |

---

## 10. Decision log

### Decisions chính (tổng hợp 5 round phỏng vấn)

| # | Decision | Rationale |
|---|---|---|
| D1 | Sách giấy only | Cần stock + ship — đủ realistic cho đồ án. Không ebook để tránh complexity file download |
| D2 | Guest cart + login bắt buộc khi checkout | Standard UX (Shopee/Tiki). Cart không cần đăng nhập → giảm friction browse |
| D3 | Ship zone-based + free threshold | Logic vừa đủ phong phú để demo, không quá đơn giản |
| D4 | 5 order statuses | Demo được flow admin xác nhận đơn trước khi giao |
| D5 | Verified review only | Chống review spam, logic check Order tồn tại — kỹ thuật ăn điểm |
| D6 | Auth tier-split | Email/pwd CORE, OAuth+verify+forgot NICE — tránh setup phức tạp ngay |
| D7 | Multi address | Realistic UX, có default flag |
| D8 | 1 admin role | RBAC overkill cho MVP, `User.role` đủ |
| D9 | Author entity riêng | Trang /author/:id ăn điểm DB design |
| D10 | Category n-n Book | Sách thuộc nhiều thể loại — realistic |
| D11 | React + Vite SPA | Modern stack, FE separate cho clean architecture |
| D12 | PostgreSQL + Prisma | ACID cho order/payment, JOIN dễ cho stats, Prisma type-safe |
| D13 | Tailwind + DaisyUI/Flowbite | Tailwind utility-first + component sẵn = balance |
| D14 | JWT localStorage | Đơn giản, phổ biến đồ án. Defense: React escape + CSP |
| D15 | ~~Firebase Storage~~ → **Cloudinary** (đổi 2026-06-10) | Firebase Storage giờ bắt buộc Blaze plan (cần thẻ + Google đòi cọc 800k cho thẻ VN). Cloudinary free 25GB, không thẻ, SDK đơn giản hơn, có sẵn resize ảnh |
| D16 | Nodemailer + Gmail SMTP | Free, không cần verify domain |
| D17 | Chỉ VNPay (không MoMo) | 1 gateway đủ demo, MoMo là scope creep |
| D18 | Cloud deploy (Render/Railway) | VNPay callback cần URL công khai |
| D19 | REST API style | Chuẩn, tài liệu nhiều, dễ chấm điểm |
| D20 | Search filter combo CORE, tsvector NICE | Filter đủ dùng, tsvector ăn điểm nếu dư time |
| D21 | Feature-based modules | Modular, dễ tách logic theo domain |
| D22 | Unit test only | Tiết kiệm time. Integration NICE |
| D23 | Zod validation | Modern, type-safe, share schema FE+BE |
| D24 | Stock trừ khi tạo, hoàn khi cancel | Tránh oversell. Transaction wrap |
| D25 | Order snapshot fields | History integrity khi data gốc đổi/xóa |
| D26 | Payment tách table riêng | Log mỗi attempt VNPay. Ăn điểm design |
| D27 | ~~Address 3 cấp (Tỉnh/Huyện/Xã)~~ → **superseded bởi D32** (2 cấp) | Seed từ provinces.open-api.vn |
| D28 | MVP-first phân tầng | Bảo vệ deadline. Checkpoint sau Phase 5 |
| D29 | **TypeScript backend + monorepo** (chốt 2 câu hỏi mở mục 11, 2026-06-10) | Zod + Prisma phát huy type-safety tốt nhất với TS; 1 repo 2 folder đơn giản nhất cho đồ án |
| D30 | Tiền tệ lưu kiểu `Int` (đơn vị: đồng) | VND không có số lẻ → không cần Decimal, tránh lỗi làm tròn, tính toán nhanh và đơn giản (2026-06-10) |
| D31 | **Prisma 7** với driver adapter `@prisma/adapter-pg` (2026-06-10) | Bản mới nhất khi init Phase 0. Khác Prisma 5/6 trong tutorial: (1) URL kết nối khai báo trong `prisma.config.ts` chứ không phải `env("DATABASE_URL")` trong schema; (2) client generate vào `backend/src/generated/prisma` (gitignored, có script postinstall); (3) runtime kết nối qua adapter `pg` truyền vào constructor thay vì query engine nhị phân |
| D32 | **Địa giới 2 cấp (34 tỉnh, Tỉnh→Phường/Xã) + tự host trong DB** (2026-06-10, supersedes D27) | (1) VN sáp nhập hành chính 2025: bỏ cấp huyện, 63→34 tỉnh — provinces.open-api.vn v2 trả cấu trúc mới, demo 2026 dùng 63 tỉnh cũ sẽ lỗi thời. (2) Tự host (bảng Province/Ward, seed từ `prisma/data/vn-locations.json` đóng băng) thay vì FE gọi API ngoài: demo không phụ thuộc uptime bên thứ ba, code trong Address/ShippingZone luôn khớp dropdown — nhất quán với SNAPSHOT principle. Đổi schema: Address/Order bỏ các cột district |
| D33 | **Frontend dùng bản mới nhất khi init** (2026-06-10): React 19.2, Vite 8, React Router 7, Tailwind 4 + DaisyUI 5 | Thiết kế ghi React 18 nhưng scaffold 2026 ra React 19 (tương thích ngược, React Query 5 hỗ trợ đầy đủ). Tailwind 4 cấu hình bằng CSS (`@import "tailwindcss"` + `@plugin "daisyui"` trong index.css, plugin trong vite.config.ts) — KHÔNG còn tailwind.config.js như tutorial Tailwind 3 |
| D34 | **Upload ảnh qua endpoint generic `POST /api/uploads`** (2026-06-12, Phase 2) | FE upload file trước → nhận URL Cloudinary → gửi URL trong JSON create/update. Tách multipart khỏi pipeline Zod validate body (mix multipart + JSON validate là phần rắc rối nhất); 1 endpoint dùng chung cho bìa sách lẫn ảnh tác giả. Trade-off chấp nhận: không lưu `public_id` trong DB nên ảnh bị thay sẽ thành orphan trên Cloudinary (xóa ảnh cũ = NICE tier, free 25GB thoải mái cho đồ án) |
| D35 | **Slug tự sinh server-side, bất biến sau create** (2026-06-12, Phase 2) | `toSlug()` tự viết bằng `normalize('NFD')` + xóa `\p{M}` + thay đ→d (không thêm dependency); trùng thì gắn hậu tố `-2`, `-3`. Update KHÔNG đổi slug theo title — URL đã chia sẻ không chết (cùng tinh thần SNAPSHOT). FE không có ô nhập slug |
| D36 | **Delete semantics 3 loại của catalog** (2026-06-12, Phase 2) | Book: KHÔNG có DELETE, chỉ toggle `is_active` (đơn cũ tham chiếu sách qua FK). Author: hard delete nhưng service chặn bằng `book.count` khi còn sách → 400 thông báo thân thiện (thay vì lỗi FK P2003 thành 500). Category: hard delete tự do — junction BookCategory có `onDelete: Cascade`, sách chỉ mất nhãn |
| D37 | **Cart API semantics** (2026-06-12, Phase 3) | Cart lazy-create bằng `upsert` theo `user_id` khi lần đầu GHI (GET không tạo row). POST add = CỘNG DỒN kiểu Shopee, dùng `{ increment }` của Prisma trong `$transaction` để ATOMIC — 2 request song song không mất lượt (sửa review vòng 3, thay vì đọc-rồi-ghi); PUT = đặt số lượng tuyệt đối. Dòng giỏ định danh bằng `book_id` trên URL (khóa tự nhiên nhờ `@@unique([cart_id, book_id])`; guest cart không biết CartItem id). Hành động chủ động của user vượt tồn → 400 rõ ràng; merge thì clamp êm. Trần 99 cuốn/dòng. Badge Navbar đếm SỐ DÒNG |
| D38 | **Guest cart chỉ lưu `{book_id, quantity}`** trong localStorage, enrich qua `GET /api/books/batch?ids=` (2026-06-12, Phase 3) | KHÔNG lưu snapshot giá/tên vào localStorage — giỏ luôn hiển thị giá HIỆN TẠI (SNAPSHOT principle chỉ áp dụng cho Order). localStorage validate bằng Zod như request body, hỏng → dọn key. Sách bị ẩn vắng mặt trong batch → FE hiện cảnh báo "không còn bán" |
| D39 | **Merge giỏ đặt trong `AuthContext.login`, AWAIT trước khi navigate** (2026-06-12, Phase 3; sửa ở review vòng 3) | 1 chỗ phủ cả 2 đường vào (LoginPage + RegisterPage đều gọi `login()`). `login` async, trang `await login()` rồi mới `navigate` → /checkout không thấy "giỏ rỗng tạm thời" do điều hướng chạy trước merge (review vòng 3). Merge xong ghi thẳng kết quả vào cache (`setQueryData(['cart'])`) nên trang đích hiển thị ngay. Merge resolve trùng bằng `max(qty)` per book_id — idempotent (re-login không nhân đôi giỏ), KHÔNG ném lỗi nghiệp vụ (sách chết bỏ qua, vượt tồn clamp). Merge fail (mất mạng) → nuốt lỗi, GIỮ guest cart, lần login sau merge lại. **BE chuẩn hóa payload trùng book_id thành max trước khi ghi** (localStorage sửa tay được) |
| D40 | **Phí ship CHỈ tính ở backend** — `calcShippingFee(provinceCode, subtotal)` trong `modules/shipping` (2026-06-12, Phase 3) | Một nguồn sự thật duy nhất: Phase 3 checkout gọi qua `GET /api/shipping/fee` để hiển thị, Phase 4 `createOrder` gọi lại NGUYÊN HÀM phía server khi chốt đơn — client có thể bị sửa nên FE không bao giờ tự tính. Đạt ngưỡng là `>=` (đúng bằng ngưỡng vẫn free); `free_threshold null` = tỉnh không áp dụng freeship |

### Pivot / Refactor

**Refactor sau Round 5:** Bản tổng hợp đầu tiên rơi vào scope creep (gom hết features bao gồm tham vọng vào 1 plan). Refactor lại với phân tầng CORE/NICE rõ ràng + checkpoint giữa các phase. Bỏ MoMo (chỉ giữ VNPay). Confirm Search filter combo (không phải tsvector) và Test unit only (không integration).

**Pivot D32 (2026-06-10):** Đổi địa giới 3 cấp → **2 cấp, tự host**. Khi vào Bước 4 Phase 0, phát hiện provinces.open-api.vn có 2 phiên bản: v1 (63 tỉnh 3 cấp, trước sáp nhập — lỗi thời) và v2 (34 tỉnh 2 cấp, chuẩn sau sáp nhập hành chính 2025). Chọn v2 vì demo năm 2026 cần data đúng thực tế, và đây là thời điểm rẻ nhất để đổi (chưa có business code nào dùng cấp huyện). Đồng thời quyết định tự host data trong DB (bảng Province/Ward + file JSON đóng băng commit vào repo) thay vì FE gọi API trực tiếp — demo bảo vệ không phụ thuộc mạng/uptime bên thứ ba. Schema: Address bỏ `district_code/district_name`, Order bỏ `shipping_district_name`.

**Pivot D15 (2026-06-10):** Đổi Firebase Storage → **Cloudinary**. Lý do: khi setup thực tế, Firebase Storage yêu cầu nâng Blaze plan (project mới không còn dùng được trên Spark free), thêm thẻ bị lỗi `OR_BACR2_44`, và Google đòi cọc trước 800.000đ với thẻ debit VN. Cloudinary đáp ứng đủ nhu cầu (chứa ảnh bìa sách): free 25GB, không cần thẻ, SDK Node đơn giản. Kiến trúc không đổi — upload vẫn đi qua backend (Multer → Cloudinary), chỉ thay `lib/firebase.ts` bằng `lib/cloudinary.ts`. Env cần: `CLOUDINARY_URL` (dạng `cloudinary://api_key:api_secret@cloud_name` — SDK tự đọc, cập nhật 2026-06-10 khi setup thực tế).

---

## 11. Câu hỏi mở / Future enhancements

### Câu hỏi mở (cần quyết khi vào Phase 0)

- ~~TypeScript hay JavaScript thuần cho backend?~~ → **Đã chốt TypeScript** (D29, 2026-06-10)
- ~~Monorepo (1 repo, 2 folder backend/frontend) hay 2 repo riêng?~~ → **Đã chốt monorepo** (D29, 2026-06-10)
- Logging service production (Logflare/Logtail) hay chỉ file? (Đề xuất: **file Winston** đủ)
- Tên domain demo nếu deploy: subdomain Render miễn phí hay mua domain? (Đề xuất: **subdomain free**)

### Future enhancements (không phải scope)

- Recommend bằng collaborative filtering (ML)
- Multi-language (i18n)
- Mobile app (React Native)
- Real-time order tracking (WebSocket)
- Loyalty points / referral program
- Multi-vendor (marketplace)
- ElasticSearch cho full-text search scale
- Admin RBAC nhiều role + permission

---

## Tham khảo

- VNPay sandbox: https://sandbox.vnpayment.vn
- Provinces VN API: https://provinces.open-api.vn
- Prisma docs: https://www.prisma.io/docs
- Cloudinary Node.js SDK: https://cloudinary.com/documentation/node_integration
- Nodemailer Gmail: https://nodemailer.com/usage/using-gmail

---

> **Trạng thái hiện tại (2026-06-10):** Đã hoàn tất 5 round interview + 1 round refactor. Pivot D15: Firebase Storage → Cloudinary. Đang chuẩn bị hạ tầng (Cloudinary, VNPay sandbox, Neon Postgres) cho Phase 0.
