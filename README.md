# Ánh Sách — Website bán sách trực tuyến

Đồ án website thương mại điện tử bán sách: khách hàng duyệt/tìm sách, đặt hàng, thanh toán
VNPay; admin quản lý kho sách, đơn hàng, voucher và xem dashboard doanh thu.

Monorepo gồm hai phần chạy độc lập: **`backend/`** (REST API — Express 5 + Prisma + Postgres)
và **`frontend/`** (SPA — React 19 + Vite).

**Bản đã deploy:** FE <https://book-store-pi-virid.vercel.app> · API
<https://bookstore-api-d5t9.onrender.com/api> (Render gói free — request đầu tiên có thể mất
~30 giây để server thức dậy).

---

## Tính năng

**Khách hàng**

- Trang chủ, danh sách sách có lọc theo danh mục/tác giả/giá, tìm kiếm kèm gợi ý (autocomplete)
- Chi tiết sách, đánh giá sao + bình luận (chỉ người đã mua mới đánh giá được), danh sách yêu thích
- Giỏ hàng (khách chưa đăng nhập giữ ở localStorage, đăng nhập thì gộp vào giỏ trên server)
- Đặt hàng: sổ địa chỉ theo tỉnh/phường, phí ship theo vùng, mã giảm giá, COD hoặc VNPay sandbox
- Theo dõi và hủy đơn, email xác nhận đơn / xác minh email / quên mật khẩu
- Đăng nhập bằng mật khẩu hoặc Google
- Chatbot tư vấn sách (DeepSeek) tra cứu được kho sách thật qua tool-calling

**Quản trị (`/admin`)**

- Dashboard KPI + biểu đồ doanh thu (Recharts)
- CRUD sách (upload ảnh bìa lên Cloudinary), danh mục, tác giả
- Quản lý đơn hàng và chuyển trạng thái, quản lý voucher, cấu hình phí ship và thông tin shop

---

## Tech stack

| Lớp | Công nghệ |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind 4 + DaisyUI 5, React Router 7, TanStack Query 5, axios, Recharts |
| Backend | Node 22, Express 5, TypeScript, Prisma 7, Zod, JWT + bcrypt, Winston, Helmet, express-rate-limit |
| Database | PostgreSQL (Neon) — 21 model Prisma, 9 migration |
| Dịch vụ ngoài | Cloudinary (ảnh bìa), Resend (email), VNPay sandbox (thanh toán), Google OAuth, DeepSeek (chatbot) |
| Kiểm thử | Jest + ts-jest (35 file test unit ở `backend/src/tests/`) |
| Triển khai | Neon (DB) · Render (API, `render.yaml`) · Vercel (FE, `frontend/vercel.json`) |

---

## Cấu trúc thư mục

```
backend/
  prisma/          schema.prisma, migrations/, seed.ts, data/ (34 tỉnh + 3.321 phường/xã)
  src/
    modules/       18 module theo nghiệp vụ, mỗi module: routes → controller → service → schemas
    middleware/    auth, adminOnly, validate (Zod), error handler tập trung
    lib/           prisma, jwt, cloudinary, mailer, vnpay, deepseek, shipping-fee, voucher...
    jobs/          cron tự hủy đơn quá hạn thanh toán
    tests/         unit test cho tầng service
frontend/
  src/
    api/           axios client + hàm gọi từng nhóm endpoint
    pages/         trang theo route (home, books, cart, checkout, orders, profile, admin...)
    components/    layout, navbar, footer, guard route (RequireAuth/RequireAdmin)
    features/      khối chức năng lớn: catalog, chat
    store/         state dùng chung (auth, giỏ hàng)
```

---

## Chạy ở local

**Cần có:** Node 22 (xem `.nvmrc`), một database PostgreSQL (khuyên dùng [Neon](https://neon.tech)
gói free), tài khoản Cloudinary. Resend / VNPay / Google / DeepSeek chỉ cần khi muốn thử các
tính năng tương ứng.

**1. Backend**

```bash
cd backend && npm install && cp .env.example .env
```

Mở `.env` điền tối thiểu `DATABASE_URL`, `JWT_SECRET` (server từ chối khởi động nếu để trống)
và `CLOUDINARY_URL`. Mỗi biến đều có ghi chú cách lấy ngay trong `.env.example`.

```bash
npx prisma migrate dev   # tạo bảng
npx prisma db seed       # nạp địa giới, phí ship, admin, sách mẫu
npm run dev              # http://localhost:3000
```

**2. Frontend** (mở terminal thứ hai)

```bash
cd frontend && npm install && cp .env.example .env
npm run dev              # http://localhost:5173
```

**3. Tài khoản mẫu sau khi seed**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@bookstore.vn` | `Admin@123` |
| Khách demo (khi `SEED_DEMO_DATA=true`) | xem log lúc seed | `Demo@123` |

> Mật khẩu mặc định chỉ dùng cho local. Ở production seed bắt buộc phải đặt
> `SEED_ADMIN_PASSWORD` mạnh, còn dữ liệu demo bị chặn hoàn toàn.

Kiểm tra nhanh backend đã lên: `curl http://localhost:3000/api/health` → JSON có
`database: connected`.

---

## Lệnh thường dùng

| Thư mục | Lệnh | Việc |
|---|---|---|
| `backend` | `npm run dev` | chạy dev có watch (tsx) |
| `backend` | `npm test` | chạy unit test (Jest) |
| `backend` | `npm run typecheck` | kiểm tra kiểu, không xuất file |
| `backend` | `npm run build` / `npm start` | build ra `dist/` và chạy bản build |
| `backend` | `npx prisma studio` | xem/sửa dữ liệu bằng giao diện |
| `frontend` | `npm run dev` | dev server Vite |
| `frontend` | `npm run build` | typecheck + build production |
| `frontend` | `npm run lint` | ESLint |

Ngoài ra `backend/scripts/` có các smoke test gọi dịch vụ ngoài thật:
`npx tsx scripts/smoke-cloudinary.ts`, `smoke-mailer.ts`, `smoke-deepseek.ts`.

---

## Biến môi trường

Không commit file `.env`. Danh sách đầy đủ kèm giải thích nằm ở `backend/.env.example` và
`frontend/.env.example`, chia theo nhóm: Server · Database · Auth · Seed · Google OAuth ·
Cloudinary · VNPay · Email (Resend) · Chatbot (DeepSeek).

Lưu ý: mọi biến của frontend phải có tiền tố `VITE_` và **là public** (nằm trong bundle gửi tới
trình duyệt) — không bao giờ đặt secret ở đó. Các API key (DeepSeek, Cloudinary, Resend...) chỉ
tồn tại ở backend.

---

## Triển khai

Hướng dẫn từng bước (tạo DB trên Neon, deploy API bằng Blueprint `render.yaml`, deploy FE lên
Vercel, cấu hình VNPay return URL, chạy seed trên production) nằm ở **[DEPLOY.md](DEPLOY.md)**.

---

## Tài liệu

| File | Nội dung |
|---|---|
| [THIET-KE.md](THIET-KE.md) | Tài liệu thiết kế: scope, tech stack, ERD, code structure, decision log |
| [SO-DO-BAO-CAO.md](SO-DO-BAO-CAO.md) | Sơ đồ Mermaid (use case, ERD, sequence...) dùng cho báo cáo |
| [THUAT-NGU.md](THUAT-NGU.md) | Sổ tra thuật ngữ kỹ thuật, giải thích cho người mới |
| [DEPLOY.md](DEPLOY.md) | Hướng dẫn triển khai Neon + Render + Vercel |
