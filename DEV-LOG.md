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

*(Phase 1 — Auth + User + Address: sẽ ghi tiếp tại đây)*
