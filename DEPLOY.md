# DEPLOY.md — Hướng dẫn triển khai (Neon + Render + Vercel)

> Stack: **DB** trên Neon (Postgres) · **Backend** Express trên Render · **Frontend** React trên Vercel.
> Tất cả đều có gói **free**. Các file cấu hình đã có sẵn trong repo: `render.yaml`,
> `frontend/vercel.json`, `.nvmrc`. File này hướng dẫn các bước bấm tay + danh sách biến môi trường.

## Sơ đồ

```
Người dùng ──> Vercel (frontend, SPA) ──gọi API──> Render (backend Express) ──> Neon (Postgres)
                                                          │
                                          VNPay sandbox / Resend / Cloudinary / Google / DeepSeek
```

Backend và Frontend phụ thuộc URL của nhau, nên thứ tự deploy quan trọng (xem dưới).

---

## Chuẩn bị trước (1 lần)

Tài khoản: [Neon](https://neon.tech) (đã có), [Render](https://render.com), [Vercel](https://vercel.com) — đăng nhập bằng GitHub cho nhanh.

Tạo sẵn 2 bí mật mới cho production (KHÔNG dùng lại của dev):

- **JWT_SECRET** — chuỗi ngẫu nhiên ≥ 32 byte. Tạo bằng:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **SEED_ADMIN_PASSWORD** — mật khẩu admin mạnh (KHÔNG để `Admin@123`).

---

## Bước 1 — Database (Neon)

Có thể dùng luôn DB Neon hiện tại, hoặc tạo **branch/project mới** cho production (khuyến nghị tách dev/prod).
Lấy **connection string** (dạng `postgresql://...?sslmode=require`) — sẽ dán vào `DATABASE_URL` của Render ở Bước 2.

> Migration + seed sẽ chạy tự động/thủ công ở Bước 2 và Bước 5, chưa cần làm gì thêm ở đây.

---

## Bước 2 — Backend (Render)

1. Render Dashboard → **New → Blueprint** → chọn repo này. Render đọc `render.yaml` và tạo service `bookstore-api`.
2. Vào service → tab **Environment** → nhập các biến `sync: false` (xem [bảng env backend](#env-backend) bên dưới).
   - `VNP_RETURN_URL` tạm điền `https://bookstore-api.onrender.com/api/payments/vnpay/return`
     (đổi đúng tên service nếu Render đặt khác — xem URL thật ở đầu trang service).
   - `FRONTEND_ORIGIN` **để tạm** giá trị bất kỳ, sẽ sửa lại ở Bước 4 sau khi có URL Vercel.
3. **Deploy**. Build sẽ chạy `npm install && npm run build && npx prisma migrate deploy`
   (tự tạo bảng trên DB). Đợi đến khi log báo `Server chạy...` và health check `/api/health` xanh.
4. Ghi lại URL backend, ví dụ `https://bookstore-api.onrender.com`.

---

## Bước 3 — Frontend (Vercel)

1. Vercel → **Add New → Project** → chọn repo này.
2. **Root Directory**: `frontend`. Framework Vercel tự nhận **Vite** (Build `npm run build`, Output `dist`).
   File `frontend/vercel.json` đã lo SPA rewrite (mọi route → `index.html`, tránh F5 bị 404).
3. **Environment Variables** (xem [bảng env frontend](#env-frontend)):
   - `VITE_API_URL` = `https://bookstore-api.onrender.com/api` (URL backend Bước 2 **+ `/api`**).
   - `VITE_GOOGLE_CLIENT_ID` = Client ID Google.
4. **Deploy**. Ghi lại URL frontend, ví dụ `https://anhsach.vercel.app`.

---

## Bước 4 — Nối 2 đầu

1. **Render** → sửa `FRONTEND_ORIGIN` = URL Vercel (vd `https://anhsach.vercel.app`, **không** có `/` cuối) → service tự redeploy.
   (Nếu không khớp, trình duyệt sẽ báo lỗi CORS khi FE gọi API.)
2. **Google Cloud Console** → APIs & Services → Credentials → OAuth client → **Authorized JavaScript origins**:
   thêm URL Vercel. (Không có bước này thì nút đăng nhập Google sẽ lỗi.)

---

## Bước 5 — Seed dữ liệu + kiểm tra admin

Bảng đã được tạo ở Bước 2, nhưng **chưa có dữ liệu** (34 tỉnh/phường, phí ship, catalog, admin).
Vào **Render → service → Shell**, chạy 1 lần:

```bash
npx prisma db seed
```

Seed idempotent (chạy lại không nhân đôi). Sau đó đăng nhập admin bằng
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` đã đặt.

> ⚠️ Quan trọng: thiếu seed thì **dropdown địa chỉ trống** (không đặt hàng được) vì chưa có tỉnh/phường.

---

## Bước 6 — Smoke test trên production

Mở URL Vercel và thử lần lượt:

- [ ] Trang chủ + `/books` hiển thị sách (DB seed OK).
- [ ] Đăng ký tài khoản mới → đăng nhập.
- [ ] Thêm sách vào giỏ → `/checkout` → chọn địa chỉ (dropdown tỉnh có dữ liệu) → đặt **COD**.
- [ ] Đăng nhập admin → `/admin` thấy dashboard → xác nhận đơn vừa đặt.
- [ ] (Tùy chọn) Thanh toán **VNPay** bằng thẻ test NCB `9704198526191432198`.
- [ ] F5 ở một trang sâu (vd `/books/mat-biec`) **không** bị 404 (SPA rewrite OK).

---

## <a id="env-backend"></a>Biến môi trường — Backend (Render)

| Biến | Bí mật? | Giá trị |
|---|---|---|
| `NODE_ENV` | | `production` (đã set sẵn trong render.yaml) |
| `DATABASE_URL` | ✅ | Connection string Neon |
| `JWT_SECRET` | ✅ | Chuỗi ngẫu nhiên mới (xem Chuẩn bị) |
| `JWT_EXPIRES_IN` | | `7d` (set sẵn) |
| `FRONTEND_ORIGIN` | ✅ | URL Vercel, không `/` cuối |
| `CLOUDINARY_URL` | ✅ | `cloudinary://KEY:SECRET@CLOUD_NAME` |
| `VNP_TMN_CODE` | ✅ | Từ VNPay sandbox |
| `VNP_HASH_SECRET` | ✅ | Từ VNPay sandbox |
| `VNP_URL` | | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` (set sẵn) |
| `VNP_RETURN_URL` | ✅ | `https://<backend>.onrender.com/api/payments/vnpay/return` |
| `RESEND_API_KEY` | ✅ | Từ Resend (`re_...`) |
| `MAIL_FROM` | ✅ | vd `BookStore <onboarding@resend.dev>` |
| `GOOGLE_CLIENT_ID` | ✅ | Client ID Google (giống FE) |
| `DEEPSEEK_API_KEY` | ✅ | Từ DeepSeek (`sk-...`) |
| `DEEPSEEK_MODEL` | | `deepseek-v4-flash` (set sẵn) |
| `SEED_ADMIN_EMAIL` | ✅ | Email admin |
| `SEED_ADMIN_PASSWORD` | ✅ | Mật khẩu admin MẠNH |

## <a id="env-frontend"></a>Biến môi trường — Frontend (Vercel)

| Biến | Giá trị |
|---|---|
| `VITE_API_URL` | `https://<backend>.onrender.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | Client ID Google (giống backend) |

> Lưu ý: biến `VITE_*` được nhúng vào JS gửi xuống trình duyệt → **không bao giờ** để secret ở đây.
> Đổi biến `VITE_*` phải **build lại** frontend (Vercel: Redeploy).

---

## Lưu ý đặc thù đồ án

- **VNPay vẫn là sandbox** (merchant TEST): demo bằng thẻ test, không thu tiền thật. Bán thật cần hợp đồng merchant.
- **Resend bản free**: chỉ gửi email tới chủ tài khoản Resend; gửi cho khách bất kỳ cần verify domain riêng.
- **Render free "ngủ"** sau ~15 phút không truy cập → lần gọi đầu chậm ~50s; cron tự-hủy-đơn-quá-hạn không chạy lúc ngủ. Chấp nhận cho demo; muốn không ngủ thì nâng gói hoặc dùng Railway.
- **IPN VNPay** (server→server) cần URL công khai — sau khi deploy Render thì URL đã public nên IPN hoạt động.

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân & cách sửa |
|---|---|
| FE gọi API báo lỗi CORS | `FRONTEND_ORIGIN` (Render) chưa khớp đúng URL Vercel (sai `https`/thừa `/`) |
| Dropdown tỉnh trống, không đặt được hàng | Chưa chạy `npx prisma db seed` (Bước 5) |
| F5 ở trang con bị 404 | Thiếu SPA rewrite — kiểm tra `frontend/vercel.json` đã được deploy |
| Nút Google không hiện/lỗi | Chưa thêm URL Vercel vào Authorized JavaScript origins; hoặc `VITE_GOOGLE_CLIENT_ID` sai |
| VNPay báo "Sai chữ ký" | `VNP_HASH_SECRET`/`VNP_TMN_CODE` sai, hoặc `VNP_RETURN_URL` không trùng cấu hình merchant |
| Build Render lỗi `migrate deploy` | `DATABASE_URL` chưa set hoặc sai khi build |
