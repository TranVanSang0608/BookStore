# DEV-LOG — Nhật ký phát triển

> Mục đích: tài liệu ôn tập khi bảo vệ đồ án. Mỗi phase một mục, ghi lại: đã làm gì,
> quyết định nào được đưa ra (và vì sao), khái niệm kỹ thuật nào cần hiểu sâu.
> Quyết định kiến trúc chi tiết nằm ở [THIET-KE.md](THIET-KE.md) mục 10 (Decision log).

---

## Phase 0 — Khởi tạo dự án (2026-06-10)

### Mục tiêu phase

Dựng khung backend + frontend chạy được end-to-end, schema CORE lên DB, hạ tầng
(Neon, Cloudinary) được xác minh hoạt động thật — sẵn sàng code feature từ Phase 1.

### Đã làm (7 bước)

| Bước | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | Monorepo `backend/` + `frontend/`, `.gitignore` root | — |
| 2 | Backend init: Express 5 + TypeScript strict, skeleton `modules/middleware/lib`, health check, Winston logger, error handler tập trung, middleware `validate(schema)` Zod | `GET /api/health` trả JSON |
| 3 | Prisma 7 + schema 14 bảng CORE, migrate lên Neon, `lib/prisma.ts` singleton | Migration `init_core_12_tables` + health check `database: connected` |
| 4 | Seed idempotent: 34 tỉnh + 3.321 phường/xã (file JSON đóng băng), 34 ShippingZone, admin user, 8 category + 6 author + 12 book mẫu | Chạy seed 2 lần — số liệu không đổi |
| 5 | Frontend init: Vite 8 + React 19 + TS, Tailwind 4 + DaisyUI 5, React Router 7, React Query 5, axios; trang Home gọi `/api/health` | Screenshot: badge "API: online" + "Database: connected" |
| 6 | Env đầy đủ (`.env.example` 6 nhóm biến), `JWT_SECRET` random 64 hex, `lib/cloudinary.ts` + smoke test | Upload + xóa ảnh thật trên Cloudinary OK |
| 7 | Chốt sổ: DEV-LOG.md này + cập nhật CLAUDE.md | — |

### Quyết định mới trong phase (chi tiết: THIET-KE.md mục 10)

- **D29** — Chốt TypeScript cho backend + monorepo (2 câu hỏi mở của thiết kế).
- **D30** — Tiền tệ lưu kiểu `Int` đơn vị đồng: VND không có số lẻ → khỏi cần Decimal, không lỗi làm tròn.
- **D31** — Prisma 7 (mới nhất khi init), setup KHÁC tutorial Prisma 5/6 — xem mục "Prisma 7 khác gì" bên dưới.
- **D32** — *Pivot lớn nhất phase*: địa giới hành chính **2 cấp, 34 tỉnh** (chuẩn sáp nhập 2025) + **tự host** trong DB thay vì FE gọi provinces.open-api.vn trực tiếp. Lý do chọn tự host: demo bảo vệ không phụ thuộc uptime API ngoài; code tỉnh/xã trong `Address`/`ShippingZone` luôn khớp dropdown. Schema bỏ các cột `district_*`.
- **D33** — Frontend bản mới nhất: React 19, Vite 8, Tailwind 4 (cấu hình bằng CSS, KHÔNG có `tailwind.config.js`), DaisyUI 5.

### Khái niệm cần hiểu để bảo vệ

**Backend:**

1. **Tách `app.ts` / `server.ts`** — `app.ts` chỉ cấu hình Express, `server.ts` mới mở port → Jest/Supertest import `app` test API không cần chạy server thật.
2. **Error handler tập trung** ([error.ts](backend/src/middleware/error.ts)) — mọi lỗi đổ về 1 chỗ, format JSON nhất quán. Lỗi nghiệp vụ dùng `AppError(statusCode, message)`; lỗi lạ trả 500 chung (không lộ nội bộ) nhưng log đủ stack. Express 5 tự forward lỗi từ async handler — không cần try/catch từng route.
3. **`validate(schema)` là higher-order function** — nhận Zod schema, trả về middleware; mỗi route chỉ khai báo schema, không lặp code validate.
4. **SNAPSHOT principle trong schema** — `Order` lưu nguyên văn địa chỉ (cột `shipping_*`, không FK về Address); `OrderItem` lưu `book_title`/`price_at_order`... với `book_id` nullable + `onDelete: SetNull` → xóa sách không vỡ lịch sử đơn.
5. **Các ràng buộc quan hệ "ăn điểm"** — 1-1 User–Cart bằng `user_id @unique`; composite PK `BookCategory(book_id, category_id)`; `@@unique([cart_id, book_id])` làm nền cho logic merge cart Phase 3.
6. **Seed idempotent** — `upsert` (theo email/slug) + `createMany({ skipDuplicates: true })` (theo PK/unique) → chạy lại bao nhiêu lần cũng không trùng data.
7. **bcrypt cost 10** — password admin băm ngay từ seed, không có plaintext trong DB.

**Prisma 7 khác gì tutorial Prisma 5/6 (D31):**

- URL kết nối khai báo trong `prisma.config.ts` (file config mới, tự nạp dotenv) — KHÔNG còn `url = env("DATABASE_URL")` trong `schema.prisma`.
- Client generate vào `backend/src/generated/prisma` (gitignored; `npm install` tự chạy lại nhờ script `postinstall`).
- Runtime kết nối qua driver adapter: `new PrismaClient({ adapter: new PrismaPg(...) })` — không còn query engine nhị phân.

**Frontend:**

8. **React Query = server state** — `useQuery({ queryKey, queryFn })` cho sẵn `isPending`/`isError`/`data`, tự cache + refetch; thay cho useEffect + useState thủ công.
9. **Một axios instance duy nhất** ([client.ts](frontend/src/api/client.ts)) — Phase 1 thêm 1 interceptor là cả app tự gắn JWT.
10. **CORS demo sống** — FE `:5173` gọi BE `:3000` được vì backend khai báo `cors({ origin: FRONTEND_ORIGIN })`.
11. **Biến `VITE_*` là public** — Vite nhúng vào JS gửi xuống browser → `frontend/.env` không bao giờ chứa secret (khác `backend/.env`).
12. **Tailwind 4 CSS-first** — `@import "tailwindcss"` + `@plugin "daisyui"` ngay trong `index.css`, plugin khai báo ở `vite.config.ts`.

**Cloudinary:**

13. **`uploadImage(buffer)` dùng `upload_stream`** — Phase 2 multer memoryStorage đưa ảnh dạng Buffer trong RAM, không ghi file tạm; helper trả về cả `public_id` để xóa/thay ảnh sau này.

### Bộ lệnh

Trong `backend/`:

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy server dev (tsx watch, port 3000) |
| `npm run typecheck` | Kiểm tra type toàn project |
| `npm run build` / `npm start` | Build ra `dist/` / chạy bản build |
| `npm test` | Jest (hiện chưa có test — Phase 1 bắt đầu viết) |
| `npx prisma migrate dev --name <tên>` | Tạo + apply migration mới |
| `npx prisma db seed` | Seed dữ liệu (idempotent, chạy lại an toàn) |
| `npx prisma generate` | Generate lại client sau khi đổi schema |
| `npx tsx scripts/smoke-cloudinary.ts` | Kiểm tra credentials Cloudinary |

Trong `frontend/`:

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Type-check + build production |

### Việc còn treo (chuyển sang phase sau)

- `VNP_TMN_CODE` / `VNP_HASH_SECRET` đang trống trong `.env` — điền khi vào Phase 5 (đăng ký sandbox.vnpayment.vn).
- Đổi password admin mặc định (`Admin@123`) trước khi deploy thật.
- Backend chưa có ESLint (frontend có sẵn từ template Vite) — cân nhắc thêm nếu dư thời gian, không bắt buộc.

---

## Phase 1 — Auth + User + Address (2026-06-11)

### Mục tiêu phase

Người dùng đăng ký/đăng nhập từ giao diện web, quản lý profile + đổi mật khẩu,
CRUD sổ địa chỉ với dropdown Tỉnh → Phường/Xã đọc từ DB. Middleware `auth`/`adminOnly`
thật thay stub. Những unit test Jest đầu tiên của dự án.

### Đã làm (5 lát, mỗi lát 1 commit)

| Lát | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | Backend Auth: `lib/jwt.ts`, middleware auth/adminOnly thật, module auth (register/login), rate limit 20 req/15p cho `/api/auth/*` | 5 unit test + 5 kịch bản HTTP (201/409/401/200/400) |
| 2 | User profile: GET/PUT `/users/me`, PUT `/users/me/password` | 4 unit test + 8 kịch bản HTTP (login mật khẩu cũ fail, mới OK) |
| 3 | Locations API (public) + Address CRUD + đặt mặc định | 6 unit test + 9 kịch bản (ownership 404, ward lệch tỉnh 400) |
| 4 | FE Auth: AuthContext + localStorage, 2 interceptor axios, trang login/register, RequireAuth, Navbar | Verify trên browser: đăng ký → navbar chào tên, F5 giữ phiên, logout, login sai hiện lỗi API |
| 5 | FE Profile: sửa thông tin (navbar đổi theo), đổi mật khẩu, sổ địa chỉ với dropdown liên động | Verify trên browser: 34 tỉnh/126 xã load đúng, badge default chuyển đúng, xóa OK |

### Khái niệm cần hiểu để bảo vệ

**Bảo mật (hội đồng rất hay hỏi nhóm này):**

1. **401 vs 403** — `auth` trả 401 ("chưa xác thực"), `adminOnly` trả 403 ("đã xác thực nhưng không đủ quyền").
2. **Chống user enumeration** — login sai email và sai password trả CÙNG một thông báo "Email hoặc mật khẩu không đúng"; ownership check địa chỉ trả 404 thay vì 403 (không tiết lộ dữ liệu người khác tồn tại).
3. **Chống mass assignment** — `updateMe` chỉ nhận đúng name/phone; client gửi `role: "admin"` cũng bị Zod strip + service bỏ qua.
4. **Đổi mật khẩu phải nhập mật khẩu hiện tại** — chống máy đang đăng nhập bị người khác chiếm tài khoản.
5. **Server không tin client** — địa chỉ chỉ nhận CODE tỉnh/xã, server tra NAME từ DB + kiểm tra ward thuộc đúng tỉnh.
6. **Rate limit** `/api/auth/*` 20 req/15 phút chống brute-force (express-rate-limit, có header RateLimit-*).
7. **Trade-off JWT thuần**: đổi mật khẩu xong token cũ vẫn sống tới hết hạn 7d — thu hồi ngay cần RefreshToken (tier NICE). Biết và nói được trade-off là điểm cộng.

**Backend:**

8. **Declaration merging** (`types/express.d.ts`) — mở rộng interface `Request` của Express để `req.user` có type; controller dùng `req.user!.id` an toàn vì mọi route đứng sau `router.use(auth)`.
9. **JWT payload tối thiểu** `{sub, role}` — thông tin đổi được thì lấy từ DB, token đã ký không sửa được.
10. **Transaction đặt địa chỉ mặc định** — "bỏ cờ cũ + set cờ mới" atomic, không bao giờ 2 default. Dùng cả 2 dạng `$transaction`: mảng (lệnh độc lập) và callback (lệnh sau phụ thuộc lệnh trước). Đây là bản nháp của transaction trừ stock Phase 4.
11. **Unit test mock Prisma** — `jest.mock('../lib/prisma')` thay module bằng jest.fn(), test logic thuần không chạm DB, 15 test chạy ~1s.
12. **Error handler phân loại lỗi 4xx của Express** — body JSON sai cú pháp trả 400 (lỗi client), không quy về 500 (lỗi hệ thống).

**Frontend:**

13. **AuthContext (client state) vs React Query (server state)** — phiên đăng nhập là client state; dữ liệu API (addresses, provinces) là server state có cache + invalidate.
14. **2 interceptor trên 1 axios instance** — request: tự gắn `Authorization: Bearer`; response: 401 khi đang giữ token → tự logout (bỏ qua `/auth/*` vì login sai cũng 401).
15. **`useState(loadStoredAuth)` lazy initializer** — đọc localStorage đúng 1 lần lúc mount → F5 giữ phiên.
16. **`RequireAuth` + `state.from`** — bị đá về login từ đâu thì login xong quay lại đó.
17. **Dropdown liên động bằng React Query** — query wards có `enabled: !!province_code`; đổi tỉnh → queryKey đổi → tự fetch; `staleTime: Infinity` vì địa giới bất biến.
18. **`invalidateQueries(['addresses'])`** sau mọi mutation — đánh dấu cache cũ, React Query tự refetch, UI tự cập nhật không cần setState tay.
19. **Tách `authStorage.ts`** khỏi AuthContext để axios interceptor dùng chung mà không import vòng tròn.

### Việc còn treo

- AGENTS.md (bản copy CLAUDE.md cho Codex) đang lỗi thời — đồng bộ tay nếu còn dùng Codex.
- Token cũ sau đổi mật khẩu vẫn sống (trade-off JWT thuần, xem mục 7).

---

*(Phase 2 — Catalog: Book + Author + Category CRUD + Search/Filter: sẽ ghi tiếp tại đây)*
