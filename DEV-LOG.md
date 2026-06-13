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

## Code review vòng 1 — sau Phase 1 (2026-06-11)

> Review toàn bộ code Phase 0+1, tìm ra 4 lỗi Major + 3 Minor. Tất cả đã sửa trong 3 lát
> (commit `c7dcd4f`, `5907623`, và lát tài liệu này). Mục này quan trọng khi bảo vệ:
> thể hiện quy trình có review, và mỗi lỗi là một câu hỏi hội đồng tiềm năng.

### Các lỗi đã sửa & bài học

| # | Lỗi | Fix | Bài học cần nhớ |
|---|---|---|---|
| 1 | ESLint fail: `AuthContext.tsx` export cả context + hook lẫn component | Tách context + `useAuth` ra `hooks/useAuth.ts` | Quy tắc **Fast Refresh** của Vite: file chứa component chỉ được export component, nếu không hot-reload hỏng ngầm |
| 2 | **Rò cache giữa 2 tài khoản**: user A logout, user B login cùng phiên browser → React Query có thể trả địa chỉ của A từ cache | `queryClient.clear()` ở **cả login lẫn logout** trong AuthProvider | Cache là trạng thái toàn cục — đổi danh tính người dùng thì mọi dữ liệu riêng tư trong cache phải bị xóa. Clear ở cả 2 cửa ngõ để cover "login đè không logout" |
| 3 | Tin raw localStorage: JSON thiếu `user` vẫn coi là đăng nhập → crash `user!.name` | `authStorage` validate shape bằng Zod, hỏng thì dọn key + coi như chưa đăng nhập | **localStorage là input không tin được** — user/extension sửa tùy ý, phải validate như request body ở backend |
| 4 | Invariant default chưa chặt: backend cho xóa địa chỉ default → user còn N địa chỉ nhưng 0 default; UI thì ẩn nút Xóa kể cả khi chỉ còn 1 địa chỉ | BE: chặn 400 nếu xóa default mà còn địa chỉ khác, cho xóa nếu là duy nhất. UI đồng bộ rule | **Backend thực thi invariant, UI chỉ phản ánh** — ẩn nút không phải là bảo vệ, gọi API trực tiếp vẫn phá được |
| 5 | Email không normalize → `A@test.com` và `a@test.com` là 2 tài khoản (Postgres unique phân biệt hoa/thường) | `trim().toLowerCase()` đầu register + login | Unique constraint của DB chỉ đúng khi dữ liệu vào đã được chuẩn hóa một kiểu |
| 6 | `getApiErrorMessage` bỏ qua mảng `errors[]` chi tiết từng field của Zod backend | Ghép message các field khi có `errors[]` | Format lỗi backend có 2 tầng (message chung + errors theo field) — FE phải đọc cả hai |
| 7 | AGENTS.md (copy của CLAUDE.md cho Codex) lệch trạng thái | Biến thành **file trỏ** sang CLAUDE.md | Tài liệu duplicate sớm muộn cũng lệch — một nguồn sự thật duy nhất |

### Ghi nhận nhưng hoãn (đúng nguyên tắc CORE-trước, xem D22)

- Supertest integration test cho `/api/auth/*`, `/api/addresses/*` — tier NICE, sau checkpoint Phase 5.
- Test framework cho FE (vitest) — gốc lỗi localStorage đã triệt bằng Zod; cân nhắc ở checkpoint.
- CI chạy lint/typecheck/test — khi setup deploy (Phase 10).

### Sự cố quy trình đáng nhớ (để không lặp lại)

- **PowerShell 5.1 phá UTF-8**: dùng `Get-Content`/`Set-Content` sửa file hàng loạt làm tiếng Việt thành mojibake (PS đọc file không BOM theo ANSI). Quy tắc mới: sửa file code bằng Edit/Write tool, không sed bằng PowerShell.
- **`git add .` cuốn file tạm**: file JSON tạm của E2E test bị commit nhầm, phải thêm 2 commit chore để dọn. Quy tắc mới: file tạm đặt ngoài repo hoặc xóa ngay trong cùng lệnh tạo ra nó.

---

## Phase 2 — Catalog: Book + Author + Category (2026-06-12)

### Mục tiêu phase

Khách xem được cửa hàng: trang `/books` có search + filter (thể loại/giá) + sort + phân trang,
trang chi tiết `/books/:slug`, trang tác giả `/author/:id`, trang chủ thật. Admin có khu
`/admin` quản lý sách (CRUD + ẩn/hiện + upload bìa lên Cloudinary), thể loại, tác giả.
**Không cần migration nào** — schema Book/Author/Category/BookCategory đã có từ Phase 0.

### Đã làm (7 lát)

| Lát | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | BE đọc public: module `catalog/` (file prefix book/category/author), `lib/slug.ts`, GET books (q ILIKE title+tác giả, category qua junction, price range, 3 kiểu sort, phân trang), detail theo slug, categories, authors, author+sách | curl trên 12 sách seed: mọi combo filter đúng, query rác tự về mặc định, slug lạ 404 |
| 2 | BE admin CRUD: `GET /books/admin` (+`/admin/:id`), POST/PUT books + toggle active, CRUD categories/authors; slug unique tự đánh số; transaction tạo sách + gắn thể loại | Script verify 11 kịch bản: slug trùng → `-2`, ẩn sách → public 404 nhưng admin thấy, xóa author còn sách → 400, user thường → 403 |
| 3 | BE upload: `POST /api/uploads` (multer memoryStorage 2MB jpg/png/webp → Cloudinary), nhánh MulterError trong error handler | curl: PNG thật nhận URL Cloudinary; file 3MB → 400 "vượt quá 2MB"; .gif → 400; không token → 401 |
| 4 | Unit test: slug (5), book service (11), author service (5) theo pattern mock Prisma | `npm test`: 42/42 xanh (15 cũ + 27 mới) |
| 5 | FE user: `/books` (filter trên URL qua `useSearchParams`), `/books/:slug`, `/author/:id`, trang chủ thật (hero + 8 sách mới), BookCard/CoverImage/Pagination/BookFilters tái dùng | Verify browser: search "ánh" ra 5 sách (khớp cả tên tác giả), sort giá, phân trang 3 trang, trạng thái rỗng, console sạch |
| 6 | FE admin: RequireAdmin + AdminLayout sidebar, bảng sách (toggle Ẩn/Hiện), form tạo/sửa sách dùng chung + upload bìa preview, trang thể loại + tác giả (form inline) | Verify browser: CRUD trọn vòng qua UI, ẩn sách biến khỏi public ngay, lỗi BE hiện trên alert, logout vào /admin bị đá về /login; gắn 4 bìa thật cho sách seed qua chính flow upload mới |
| 7 | Tài liệu: mục này + D34–D36 + CLAUDE.md | — |

### Quyết định mới trong phase (chi tiết: THIET-KE.md mục 10)

- **D34** — Upload qua endpoint generic `POST /api/uploads`: FE upload trước lấy URL, rồi gửi URL trong JSON create/update. Body sách luôn là JSON thuần → pipeline Zod validate giữ nguyên. Trade-off: không lưu `public_id` → ảnh bị thay thành orphan trên Cloudinary (chấp nhận, xóa ảnh cũ là NICE).
- **D35** — Slug sinh server-side lúc create, bất biến khi update (URL không chết — cùng tinh thần SNAPSHOT); trùng thì `-2`, `-3`.
- **D36** — Delete 3 kiểu: Book chỉ ẩn (`is_active`), Author chặn xóa khi còn sách (400 thân thiện), Category xóa tự do (junction cascade).

### Khái niệm cần hiểu để bảo vệ

**Backend:**

1. **Bỏ dấu tiếng Việt bằng Unicode** ([slug.ts](backend/src/lib/slug.ts)) — `normalize('NFD')` tách "ắ" thành "a" + ký tự dấu rời, xóa dấu bằng regex `\p{M}` (Unicode property "Mark", cờ `u`); riêng **đ/Đ không phải "d có dấu"** nên phải thay tay. Hội đồng hỏi "slug sinh thế nào" là trả lời được cả NFD lẫn vòng lặp chống trùng.
2. **Route public và admin trên cùng router** — catalog KHÔNG dùng `router.use(auth)` cả file như address; GET để trần, mutation gắn `auth, adminOnly` per-route.
3. **Thứ tự route quan trọng** — `GET /admin` phải đăng ký TRƯỚC `GET /:slug`, nếu không Express coi "admin" là một slug → 404 ([book.routes.ts](backend/src/modules/catalog/book.routes.ts)).
4. **Filter n-n bằng `some`** — "sách thuộc thể loại X": `categories: { some: { category: { slug } } }` — dịch ra EXISTS trên bảng junction.
5. **Phân trang offset** — `skip = (page-1) × limit`, `totalPages = ceil(total/limit)`; `findMany` + `count` cùng `where` chạy `Promise.all` (chỉ đọc, không cần transaction).
6. **Zod `.catch()` cho query string** — khác `.parse()` ném lỗi, `.catch(default)` nuốt giá trị rác (`?page=abc` → trang 1): lỗi của khách gõ URL không đáng trả 400. Middleware `validate()` chỉ chạy body nên query parse trong controller.
7. **Vì sao không thêm index cho search** — ILIKE `%...%` không dùng được btree index; vài trăm sách seq scan vẫn nhanh. Nói được "biết nhưng không làm vì YAGNI" là điểm cộng; full-text tsvector là NICE (D20).
8. **multer memoryStorage vs diskStorage** — file nằm trong RAM dạng Buffer, đẩy thẳng lên Cloudinary qua `upload_stream`, không có file tạm phải dọn; an toàn vì giới hạn 2MB + chỉ admin.

**Frontend:**

9. **State filter nằm trên URL** (`useSearchParams`) — copy link ra đúng kết quả, nút Back hoạt động; đổi filter thì xóa `page` (trang 5 của kết quả cũ vô nghĩa). queryKey chứa cả object params → đổi filter là React Query tự refetch.
10. **Form admin giữ mọi field dạng string** — input HTML trả string; chỉ đổi sang số khi build payload. Field optional bỏ trống gửi `undefined` → Zod `.optional()` nhận, Prisma bỏ qua khi update.
11. **Upload 2 bước trên UI** — chọn file → POST `/uploads` ngay (hiện preview) → URL đi cùng payload khi bấm Lưu; nút Lưu disable khi đang upload.
12. **RequireAdmin chỉ là chặn giao diện** — bảo mật thật là middleware `adminOnly` ở backend; user sửa JS qua mặt được FE nhưng API vẫn trả 403.
13. **Invalidate nhiều queryKey sau mutation** — sửa sách xong phải invalidate cả `['admin-books']` lẫn `['books']` (public đang cache); toggle ẩn/hiện cũng vậy.

### Việc còn treo

- Ảnh cũ trên Cloudinary thành orphan khi thay bìa (D34) — dọn bằng `public_id` nếu dư thời gian sau checkpoint.
- AGENTS.md vẫn là file trỏ (như Phase 1).

---

## Code review vòng 2 — sau Phase 2 (2026-06-12)

> Review code Phase 2: 0 Critical (auth/adminOnly backend gắn đúng), 2 Major + 3 Minor.
> Tất cả đã sửa và verify lại trên browser. Mỗi lỗi dưới đây là một câu hỏi hội đồng tiềm năng.

### Các lỗi đã sửa & bài học

| # | Lỗi | Fix | Bài học cần nhớ |
|---|---|---|---|
| 1 | **Lint fail + rủi ro mất dữ liệu form**: `AdminBookFormPage` đổ dữ liệu sách vào form bằng `setForm()` trong `useEffect` (vi phạm `react-hooks/set-state-in-effect`); nếu query refetch (focus lại cửa sổ) khi admin đang sửa dở, effect đổ lại data server → mất nội dung chưa lưu | Tách 2 tầng: trang ngoài lo TẢI (query + spinner), `BookForm` con lo NHẬP — nhận `initial` qua props, `useState(initial)` khởi tạo đúng 1 lần lúc mount, `key={editId}` để đổi sách thì remount | **"You might not need an effect"**: đồng bộ props→state bằng effect là anti-pattern; pattern chuẩn là khởi tạo state từ props trong component con + `key` để reset. Đã verify: gõ dở → giả lập focus refetch → form giữ nguyên |
| 2 | **Claim "filter trên URL" chưa trọn**: ô search/giá của `BookFilters` giữ state cục bộ từ lúc mount — Back/Forward hoặc mở link share làm KẾT QUẢ đổi theo URL nhưng INPUT vẫn hiện giá trị cũ | Thêm `key={q\|price_min\|price_max}` khi render `BookFilters` — URL đổi ngoài form thì component remount, đọc lại từ URL | `useState(props)` chỉ chạy lần đầu; muốn state cục bộ "reset theo props" thì dùng `key`. Đã verify: mở link → input đúng, pushState → input đổi, Back → khôi phục cả q lẫn giá |
| 3 | Sửa tác giả/thể loại chỉ invalidate 1 queryKey — tên cũ còn sống trong cache `['books']`, `['book', slug]`, `['author', id]`, `['admin-book']` | Invalidate cả NHÓM key liên quan (vòng `for` qua danh sách key, có comment giải thích từng key) | Một entity hiện ở N màn hình = N cache key; sửa entity phải invalidate đủ N nơi, không chỉ trang đang đứng |
| 4 | Form sửa tác giả không load bio cũ (list chỉ trả id+name) | `startEdit` gọi `fetchAuthor(id)` lấy bio TRƯỚC rồi mới đổ form (tránh ghi đè khi user đã gõ) | Endpoint list trả gọn là đúng (D — dropdown chỉ cần id+name); form sửa cần data đầy đủ thì gọi detail, đừng phình endpoint list |
| 5 | 2 chỗ code "đúng nhưng chưa nói rõ trade-off" | Thêm comment: (a) `createBook` — check slug unique ngoài transaction, 2 admin tạo trùng title cùng lúc có thể đụng P2002, DB là lớp chặn cuối nên data không hỏng; (b) `fileFilter` multer — `file.mimetype` là header client tự khai (giả mạo được), lớp chặn thật là Cloudinary đọc nội dung file | Khi bảo vệ, nói được "tôi biết kẽ hở này và vì sao chấp nhận" giá trị hơn là code im lặng |

### Ghi nhận nhưng hoãn (đúng nguyên tắc CORE-trước, D22)

- FE test/Playwright cho flow filter + Back, form không reset khi refetch — tier NICE, cân nhắc sau checkpoint Phase 5.
- Supertest cho thứ tự route `/admin` vs `/:slug`, 403, sách ẩn 404 — integration test là NICE; logic này đã có unit test (`getBookBySlug` 404 sách ẩn) + verify thủ công.
- Lưu ý quy trình khi commit Phase 2: nhiều file mới đang untracked (`backend/src/modules/catalog|upload`, `frontend/src/pages/books|admin`, `frontend/src/features/catalog`...) — commit phải `git add` theo thư mục có chủ đích, kiểm tra `git status` sạch trước khi kết thúc.

---

## Phase 3 — Cart + Checkout (2026-06-12)

### Mục tiêu phase

Giỏ hàng 2 chế độ: guest dùng localStorage (browse không cần đăng nhập — D2), user dùng
DB cart; login thì merge guest vào DB resolve trùng bằng `max(qty)` per book_id. Trang `/cart`
(sửa số lượng, xóa, tạm tính), trang `/checkout` (chọn địa chỉ, phí ship theo zone, tổng tiền).
Nút "Đặt hàng" disabled chờ Phase 4 (transaction tạo Order). **Không cần migration** —
Cart/CartItem/ShippingZone có từ Phase 0.

### Đã làm (6 lát)

| Lát | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | BE module `cart/`: GET (không tạo row), POST items (cộng dồn atomic), PUT/DELETE theo `:bookId`, POST merge (max + clamp trong transaction) | 17 unit test merge/stock + curl trọn vòng: cộng dồn atomic, merge max(4,1)=4, vượt tồn 400 (2 test merge-duplicate thêm ở review vòng 3) |
| 2 | BE `shipping/` calcShippingFee + `GET /api/books/batch?ids=` (đăng ký trước `/:slug`) | 5 unit test (biên `>=` ngưỡng) + curl: 35k → 0đ khi đạt 300k, tỉnh lạ 400, batch lọc id rác |
| 3 | FE hạ tầng: `cartStorage` (Zod validate localStorage), `CartContext` 2 chế độ + `useCart`, badge Navbar, nút thêm giỏ ở BookDetailPage | Browser: guest thêm → badge tăng, cộng dồn 1 dòng, F5 còn, localStorage rác bị dọn; user thêm → row DB |
| 4 | FE trang `/cart` (stepper, cảnh báo dòng chết, tạm tính) + merge trong `AuthContext.login` | Kịch bản then chốt: DB A=5, guest A=3+B=1 → login → A=5 (max) + B=1, guest key dọn; logout → giỏ guest rỗng (không rò giỏ DB) |
| 5 | FE trang `/checkout`: radio địa chỉ (mặc định tự chọn — derived value, không effect), phí ship tự refetch khi đổi tỉnh, tổng tiền, nút Đặt hàng disabled | Browser: đổi địa chỉ HN↔Cần Thơ phí 20k↔35k, đúng 300k → "Miễn phí"; guest bấm CTA → login → vào thẳng /checkout với giỏ đã merge |
| 6 | Tài liệu: mục này + D37–D40 + CLAUDE.md | — |

### Quyết định mới trong phase (chi tiết: THIET-KE.md mục 10)

- **D37** — Cart API: lazy-create upsert theo user_id; POST cộng dồn / PUT tuyệt đối; dòng định danh bằng book_id; user vượt tồn → 400, merge → clamp; badge đếm số dòng.
- **D38** — Guest cart chỉ lưu `{book_id, quantity}`, enrich qua `/api/books/batch` — giỏ luôn hiện giá HIỆN TẠI (SNAPSHOT chỉ cho Order).
- **D39** — Merge trong `AuthContext.login`, AWAIT trước khi navigate (phủ cả login lẫn register; tránh /checkout flash giỏ rỗng — sửa ở review vòng 3); fail → giữ guest cart.
- **D40** — Phí ship chỉ tính ở BE; `calcShippingFee` là nguồn sự thật duy nhất, Phase 4 createOrder tái dùng nguyên hàm.

### Khái niệm cần hiểu để bảo vệ

**Logic merge (hội đồng sẽ hỏi — risk được nêu sẵn trong THIET-KE.md mục 9):**

1. **Vì sao `max(qty)` chứ không cộng dồn** — merge phải IDEMPOTENT: user logout/login nhiều lần không được nhân đôi giỏ. `max(guest, db)` = "ý định mua lớn nhất user từng thể hiện", chạy lại bao nhiêu lần kết quả không đổi.
2. **Vì sao merge không bao giờ ném lỗi nghiệp vụ** — merge là bước nền chạy ngầm sau login; 1 cuốn sách hết hàng không được làm fail flow đăng nhập. Sách chết → bỏ qua êm, vượt tồn → clamp. Ngược với hành động CHỦ ĐỘNG (thêm/sửa giỏ) thì 400 rõ ràng để user biết.
3. **Merge fail thì sao** — giữ nguyên guest cart trong localStorage (không mất hàng), lần login sau merge lại; an toàn nhờ tính idempotent ở mục 1.
4. **Vì sao merge đặt trong `AuthContext.login`** — 1 chỗ phủ cả LoginPage lẫn RegisterPage (register tự đăng nhập); gọi sau `saveStoredAuth` để axios interceptor đã có token.

**Backend:**

5. **Lazy-create cart bằng upsert** — GET không tạo row (đọc không được ghi); cart chỉ sinh khi lần đầu thêm hàng; `upsert` theo `user_id @unique` là idempotent.
6. **POST cộng dồn vs PUT tuyệt đối** — POST /items = "thêm vào" (bấm 2 lần ra 2+3), PUT /items/:bookId = "đặt thành" (ô nhập số). Dòng giỏ định danh bằng book_id nhờ `@@unique([cart_id, book_id])`.
7. **Subtotal tính ở BE, chỉ gồm sách active** — dòng sách bị ẩn vẫn trả về (FE hiện cảnh báo) nhưng không tính tiền.
8. **calcShippingFee là nguồn sự thật duy nhất** — biên `>=` ngưỡng (đúng 300k vẫn free, có test riêng); `free_threshold null` = không áp dụng freeship; FE không bao giờ tự tính phí vì client sửa được.

**Frontend:**

9. **Context 2 chế độ sau 1 interface** — `useCart()` giấu hoàn toàn guest/user: guest = useState + write-through localStorage, user = `useQuery(['cart'])` + invalidate sau mutation. Navbar/BookDetail/CartPage không cần biết chế độ.
10. **Đổi phiên → đọc lại localStorage NGAY TRONG RENDER** (so sánh `prevLoggedIn`) — pattern "adjusting state when props change" chính thống của React docs, KHÔNG phải useEffect + setState (bài học review vòng 2). Cần thiết để logout không rò state giỏ cũ.
11. **Giỏ không snapshot giá** — localStorage chỉ giữ id+qty, trang giỏ enrich qua `/books/batch` lấy giá hiện tại; SNAPSHOT principle chỉ áp dụng từ lúc chốt Order.
12. **Checkout không có effect nào** — địa chỉ chọn là derived value (`picked ?? default ?? đầu tiên`); phí ship tự refetch nhờ queryKey chứa `[tỉnh, subtotal]`.
13. **localStorage validate như request body** — guest cart key qua Zod safeParse, hỏng → dọn key (đã verify bằng cách sửa tay thành JSON rác).

### Việc còn treo

- Nút "Đặt hàng" disabled — Phase 4 thay bằng mutation createOrder (transaction trừ stock, snapshot địa chỉ + giá).
- Stepper giỏ chưa debounce/optimistic (mỗi click 1 PUT) — NICE, đủ dùng cho đồ án.

---

## Code review vòng 3 — sau Phase 3 (2026-06-12)

> Review code Phase 3 (cart merge/add là core logic): 0 Critical, 3 Major + 2 Minor.
> Tất cả đã sửa + verify lại trên browser (kể cả kịch bản race). Mỗi lỗi là 1 câu hỏi hội đồng.

### Các lỗi đã sửa & bài học

| # | Lỗi | Fix | Bài học cần nhớ |
|---|---|---|---|
| 1 | **POST /cart/items cộng dồn không atomic**: đọc quantity cũ rồi ghi `newQty` — 2 request thêm cùng sách song song đọc cùng giá trị cũ → đè nhau, mất 1 lần cộng | Dùng `update: { quantity: { increment: n } }` của Prisma (DB tự cộng, atomic) trong `$transaction`; increment xong mới check tồn, vượt thì throw → rollback | **Read-modify-write là cái bẫy race condition kinh điển.** Khi tăng/giảm một số trong DB, dùng phép tăng atomic của DB (`increment`), đừng đọc-cộng-ghi ở tầng app. Đã verify: 2 POST song song qty 2 → tổng đúng 4 |
| 2 | **Merge không chuẩn hóa payload trùng book_id**: `[{book_id:1,qty:5},{book_id:1,qty:3}]` (localStorage sửa tay) cho kết quả phụ thuộc thứ tự, không phải max | BE gom payload vào `Map` lấy max trước khi loop; FE `loadGuestCart` cũng normalize khi đọc | **"localStorage là input không tin được" áp dụng cả cho TRÙNG LẶP, không chỉ shape.** Validate Zod chỉ chặn sai kiểu; logic gom trùng phải làm thêm. BE không bao giờ tin client đã chuẩn hóa |
| 3 | **Merge fire-and-forget → /checkout thấy giỏ rỗng tạm thời**: `navigate` chạy trước khi merge ghi xong | `login` đổi thành async, LoginPage/RegisterPage `await login()` rồi mới navigate; merge xong `setQueryData(['cart'])` để trang đích có data ngay | Khi một việc async PHẢI xong trước khi điều hướng, `await` nó — đừng fire-and-forget rồi mong refetch cứu. Trade-off: login chậm hơn ~1 round-trip nhưng đúng. Đã verify user MỚI (chưa có cart) + guest cart → login → checkout KHÔNG nhấp nháy rỗng |
| 4 | (Minor) Endpoint `/shipping/fee` nhận `subtotal` từ client | Thêm cảnh báo ⚠️ to trong service: Phase 4 `createOrder` PHẢI tự tính subtotal từ giỏ DB, không tin client | Tiền bạc thì server tự tính từ nguồn của mình; tham số tính tiền do client gửi chỉ dùng cho PREVIEW hiển thị |
| 5 | (Minor) Guest cart trùng có thể gây duplicate React key ở trang giỏ | Giải quyết luôn bởi #2 (normalize khi load) — không còn dòng trùng | Một fix đúng chỗ (cửa đọc dữ liệu) dập được nhiều triệu chứng ở các tầng trên |

### Ghi nhận nhưng hoãn (đúng D22 — unit/manual đủ cho CORE)

- E2E (Playwright) cho flow guest→login→checkout không flash, localStorage rác/trùng không vỡ UI, cart có sách inactive chặn checkout — đã verify THỦ CÔNG trên browser; tự động hóa là NICE.
- Test concurrency thật cho addItem (2 request đua) — unit test kiểm `increment` được dùng; verify race thật đã làm thủ công qua `Promise.all` 2 POST.

---

*(Phase 4 — Order: transaction tạo/hủy đơn + admin quản lý đơn: sẽ ghi tiếp tại đây)*
