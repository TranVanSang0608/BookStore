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

## Phase 4 — Order (2026-06-13)

### Mục tiêu phase

Khép kín luồng CORE: thay nút "Đặt hàng" disabled (Phase 3) bằng `createOrder` thật —
đặt đơn COD trừ kho trong transaction, user xem/hủy đơn, admin quản lý + đổi trạng thái,
cron tự hủy đơn treo >24h. **Không cần migration** — Order/OrderItem/Payment + enum
có từ Phase 0. NGOÀI scope: VNPay (Phase 5), voucher/email/review (NICE).

### Đã làm (6 lát)

| Lát | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | `lib/order-code.ts` + module `order/` service: createOrder (transaction snapshot + conditional decrement), cancelOrder (idempotent hoàn kho), getUserOrders/getOrderByCode/admin*, state machine | 21 unit test (snapshot, oversell 409 rollback, hoàn kho, double-cancel noop, state machine nhảy/lùi/terminal, Delivered→Payment Paid, order_code retry P2002) |
| 2 | `order/{controller,routes}` + `jobs/auto-cancel-orders.ts` + mount app.ts + cron server.ts | curl trọn vòng: đặt đơn (kho 50→48, giỏ rỗng, mã BK-...), hủy (kho hoàn 50), admin nhảy bước→400, tiến đúng Pending→...→Delivered (Payment Paid), hủy đơn Delivered→400, user thường /admin→403, xem đơn người khác→404 |
| 3 | FE `api/orders`, `lib/order-status` (label+màu), `OrderDetailPage`, wire CheckoutPage (COD radio + note + createOrder → invalidate cart + navigate), route `/orders/:code` | Browser: đặt COD → về `/orders/BK-...`, status "Chờ xác nhận", giỏ rỗng; hủy đơn → "Đã hủy", kho hoàn |
| 4 | `OrdersPage` (lịch sử + phân trang) + Navbar "Đơn hàng của tôi" | Browser: /orders thấy đơn, click ra chi tiết |
| 5 | `Admin{Orders,OrderDetail}Page` + sidebar "Đơn hàng" + routes | Browser: bảng đơn + filter status + search; tiến trạng thái Xác nhận→Giao→Đã giao (Payment "Paid"), hết nút khi terminal |
| 6 | Tài liệu: mục này + D41–D45 + CLAUDE.md | — |

### Quyết định mới trong phase (chi tiết: THIET-KE.md mục 10)

- **D41** — order_code `BK-YYYYMMDD-XXXXX` (crypto random, retry P2002).
- **D42** — state machine tiến 1 bước + quyền user/admin (hủy theo điều kiện).
- **D43** — COD payment: Pending khi tạo, Paid khi Delivered, Cancelled khi hủy.
- **D44** — cron auto-hủy Pending >24h (server.ts, guard test/env).
- **D45** — chống oversell bằng conditional decrement `updateMany.gte` + assert count.

### Khái niệm cần hiểu để bảo vệ

**Transaction & tồn kho (hội đồng chắc chắn hỏi):**

1. **createOrder atomic** — tạo Order + OrderItem + trừ kho + tạo Payment + dọn giỏ nằm TRONG 1 `$transaction`: hoặc tất cả thành công, hoặc rollback sạch. Không có cảnh "đơn tạo rồi mà kho chưa trừ".
2. **Chống oversell (D45)** — điểm ăn điểm: trừ kho bằng `updateMany({ where: stock >= qty }, decrement)` rồi assert `count===1`. Câu UPDATE gộp kiểm-và-trừ atomic ở DB; 2 đơn mua cuốn cuối song song thì chỉ 1 khớp, đơn kia count=0 → throw → rollback. Đọc-rồi-trừ thì cả 2 đọc stock=1 rồi cùng trừ → âm kho.
3. **Stock trừ lúc tạo (Pending), hoàn lúc Cancel (D24)** — giữ chỗ hàng cho khách ngay; đơn ma treo mãi thì cron 24h hoàn kho.
4. **cancelOrder idempotent** — đọc lại đơn đầu transaction, đã Cancelled thì noop. Chống cron + user hủy gần nhau → hoàn kho 2 lần. Dùng chung cho user/admin/cron.

**SNAPSHOT (D25):**

5. **Vì sao snapshot** — OrderItem lưu title/tác giả/giá/bìa TẠI LÚC ĐẶT; Order lưu địa chỉ giao (không FK Address). Sách đổi giá/đổi tên/bị xóa hay user xóa địa chỉ thì lịch sử đơn vẫn đọc đúng. `book_id` nullable + `onDelete SetNull`: xóa sách không vỡ đơn.

**State machine & quyền (D42):**

6. **Tiến đúng 1 bước** — map `ADMIN_NEXT_STATUS`; nhảy/lùi → 400. Few transitions = few bugs.
7. **Ai hủy được gì** — user chỉ hủy đơn mình khi Pending; admin hủy khi Pending/Confirmed; Shipping/Delivered không hủy. Controller kiểm quyền, service làm atomic.
8. **COD Paid khi Delivered (D43)** — tiền mặt chỉ thực thu lúc giao thành công → đó là điểm lật Payment Paid.

**Hạ tầng:**

9. **Cron đặt ở server.ts không phải app.ts (D44)** — Jest/Supertest import `app` để test; nếu cron ở app.ts thì test vô tình spawn cron. Tách ra + guard `NODE_ENV=test`.
10. **order_code retry P2002 (D41)** — bọc cả transaction trong vòng lặp: trùng mã (P2002) → sinh mã mới chạy lại; lỗi khác (oversell 409) ném thẳng, không retry.
11. **Enum Prisma trong test** — import enum dạng VALUE từ generated client làm Jest fail (không resolve `internal/class.js`). Cách tránh: service/schema dùng string literal ('Pending'...) + import type-only; giống cart dùng 'cod' literal.

### Việc còn treo

- VNPay (Phase 5) — Payment đã tách bảng + có cột `txn_ref/gateway_response` chờ sẵn.
- Cron mới verify bằng unit test `cancelOrder` + logic; chưa chạy đợi 24h thật (chấp nhận cho đồ án).
- Email xác nhận đơn (NICE).

---

## Code review vòng 4 — sau Phase 4 (2026-06-13)

> Review tập trung concurrency của Order (phần dễ sai nhất): 3 Critical + 3 Major về race.
> Đã sửa bằng atomic guard ở tầng DB (KHÔNG đổi isolation, KHÔNG raw SQL) + verify race THẬT
> trên Postgres bằng `Promise.all` (không chỉ mock). 90/90 unit test xanh.

### Các lỗi đã sửa & bài học

| # | Lỗi | Fix | Bài học cần nhớ |
|---|---|---|---|
| 1 | **createOrder chưa atomic với giỏ**: đọc giỏ ngoài transaction → double-click/2 tab có thể tạo 2 đơn từ 1 giỏ | Xóa giỏ trong transaction bằng `deleteMany` theo book_id + **assert `count === số dòng đặt`**: 2 request tranh nhau xóa cùng dòng, chỉ 1 thắng (count khớp), request kia count lệch → throw 409 → rollback cả đơn lẫn trừ kho. Verify thật: `201 + 409` | "1 giỏ → 1 đơn" cần 1 ĐIỂM SERIALIZE ở DB. Dùng chính việc xóa dòng giỏ làm "token tranh chấp" — gọn hơn lock/isolation |
| 2 | **cancelOrder hoàn kho 2 lần khi hủy song song**: đọc status rồi update theo id, 2 request cùng đọc Pending → cùng hoàn kho | Đổi sang **conditional `updateMany({ where: { id, status }, ... })`** rồi assert `count===1`; chỉ "người thắng" hoàn kho. Verify thật: double-cancel → kho hoàn ĐÚNG 1 lần (delta=1) | Update có ĐIỀU KIỆN trạng thái + check count = compare-and-set atomic ở DB. Đọc-rồi-ghi không bao giờ idempotent dưới race |
| 3 | **Admin advance có thể "hồi sinh" đơn đã Cancelled**: đọc status rồi update theo id, nếu cron/user hủy xen vào thì vẫn đẩy Cancelled→Confirmed | Forward cũng dùng conditional `updateMany({ where: { id, status: vừa-đọc } })`; status đã đổi → count=0 → 409 "tải lại trang". Không hồi sinh | Mọi transition phải gắn điều kiện "from-status" vào chính câu UPDATE, không validate rời rồi update mù |
| 4 | **Quyền hủy kiểm ngoài transaction** (user chỉ Pending) | Thêm tham số `cancelOrder(id, allowedFrom[])`: user/cron `['Pending']`, admin `['Pending','Confirmed']` — invariant quyền nằm TRONG transaction, check ngoài chỉ để báo lỗi đẹp | Invariant nghiệp vụ phải enforce ở nơi atomic, không tin check ở controller (có thể stale) |
| 5 | **createOrder xóa CẢ giỏ** → sách thêm ở tab khác lúc đặt bị mất | `deleteMany` lọc `book_id: { in: orderedBookIds }` — chỉ xóa đúng dòng đã đặt | Xóa có chủ đích theo id, đừng "xóa sạch theo user" khi chỉ muốn bỏ phần liên quan |
| 6 | **FE type nói quá**: createOrderApi khai `OrderDetail` nhưng BE trả order trần | BE create/cancel/adminUpdate đều `return findUnique(..., include: items+payments)` → đúng `OrderDetail`. Verify: create trả items=2, payments=1 | Type là hợp đồng — để BE trả đúng shape FE khai, đừng để "nói quá sự thật" dù runtime chưa vỡ |

### Ghi nhận nhưng hoãn (đúng D22)

- Integration test tự động cho race (Playwright/supertest nhiều luồng) — đã verify THỦ CÔNG bằng `Promise.all` trên DB thật (double-submit `201+409`, double-cancel hoàn kho 1 lần); tự động hóa là NICE.
- Cron fake-clock test — logic `cancelOrder(id, ['Pending'])` đã unit-test; gọi hàm job nội bộ để test sâu hơn để sau.

## Code review vòng 5 — siết thêm Order concurrency (2026-06-13)

> Follow-up vòng 4: 2 Major + 3 Minor còn sót về race/an toàn. Đã sửa + verify lại race
> THẬT trên Postgres (`Promise.all`). 91/91 unit test xanh.

| # | Lỗi | Fix | Bài học |
|---|---|---|---|
| 1 | **cancelOrder trả 200 khi claim count=0** dù đơn KHÔNG bị hủy (user bấm hủy đúng lúc admin xác nhận → API báo success nhưng đơn thành Confirmed) | Khi claim count=0, RE-READ: status=Cancelled (request hủy khác thắng) → noop 200 idempotent; status khác (Confirmed...) → **409** "tải lại trang". Verify thật: cancel=409, confirm=200, đơn cuối Confirmed | "Mất race" có 2 nghĩa khác nhau — phải phân biệt "ai đó đã làm hộ việc mình" (noop OK) vs "trạng thái đã đổi nên việc mình bất khả" (báo lỗi) |
| 2 | **createOrder check giỏ chỉ theo book_id** → tab khác đổi qty/thêm cùng cuốn trong lúc checkout thì thay đổi bị mất | Xóa giỏ theo ĐÚNG (book_id + quantity) đã snapshot; lệch → count thiếu → 409 rollback. Optimistic concurrency: đơn chỉ commit nếu giỏ y nguyên lúc đọc | Khi snapshot dữ liệu rồi mới ghi, điều kiện xóa/cập nhật phải khớp CẢ giá trị đã đọc, không chỉ khóa chính |
| 3 | (Minor) `cancelOrder` default `allowedFrom` gồm cả Confirmed → caller quên truyền dễ lỡ cho hủy | Đổi default về `['Pending']` — chặt nhất, **fail-closed** | Giá trị mặc định của tham số an toàn nên là cái HẠN CHẾ nhất, không phải tiện nhất |
| 4 | (Minor) Cron log "auto-hủy thành công" cả khi cancelOrder noop do race | Bỏ log per-đơn; log TỔNG KẾT `{ quet, loi }` sau vòng lặp + chỉ log error khi throw | Đừng log "đã làm X" khi không chắc mình thực sự làm X — log sự kiện quan sát được, không log phỏng đoán |
| 5 | (Minor) Test mock Prisma chưa chứng minh race thật | Bổ sung verify thủ công `Promise.all` trên DB thật: double-submit `201+409`, double-cancel hoàn kho 1 lần, cancel-vs-confirm `409` | Mock chứng minh LOGIC; race condition phải verify trên DB thật (dù chỉ thủ công) |

---

## Phase 5 — Payment VNPay sandbox (2026-06-14)

### Mục tiêu phase

Thêm VNPay làm phương thức thanh toán online bên cạnh COD → **hoàn tất luồng CORE end-to-end**
(khách trả tiền online được). Chỉ VNPay (D17). **Không cần migration** — Payment (gateway
cod|vnpay, txn_ref, gateway_response, paid_at) có sẵn từ Phase 0. Ngoài scope: refund, MoMo, email biên lai.

### Đã làm (6 lát)

| Lát | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | Credentials vào `.env` (gitignore); `lib/vnpay.ts` (buildPaymentUrl + verifyCallback, HMAC-SHA512 bám demo VNPay) | 6 unit test: build→verify khớp, giả mạo amount/txnRef → invalid, thiếu env → throw |
| 2 | createOrder branch gateway theo payment_method + sinh txn_ref vnpay (`lib/order-code.generateTxnRef`); cron bỏ qua đơn đã Paid (D49) | test: vnpay → Payment gateway vnpay + txn_ref; cron where loại đơn Paid |
| 3 | Module `payment/` (create + return + ipn + `reconcileVnpayPayment` idempotent); mount; wire order create gắn payment_url | 10 unit test + **verify DB thật**: tạo đơn → payment_url; callback đã ký → Payment Paid; IPN gọi lại → RspCode 02 (idempotent); chữ ký sai → redirect invalid / RspCode 97 |
| 4 | FE: `api/orders` payment_method union + `startVnpayPaymentApi`; CheckoutPage bật radio VNPay + redirect `window.location` khi có payment_url | browser: chọn VNPay → POST /orders 201 (preview sandbox không đi ra domain ngoài được) |
| 5 | FE: `PAYMENT_STATUS_META` + OrderDetailPage hiện gateway/badge + nút "Thanh toán VNPay" retry + banner `?payment=` | browser: trang đơn VNPay hiện "Chờ thanh toán" + nút; banner success(xanh)/failed(đỏ) đúng |
| 6 | Tài liệu: mục này + D46–D49 + CLAUDE.md | — |

### Quyết định mới (chi tiết: THIET-KE.md mục 10)

- **D46** — VNPay tái dùng createOrder; VNPay Paid không đổi Order.status (vẫn Pending chờ admin).
- **D47** — Cả IPN + Return, chung `reconcileVnpayPayment` idempotent; Return về backend rồi redirect FE.
- **D48** — txn_ref = order_code bỏ `-` + hậu tố thời gian, mỗi lần thử 1 row Payment mới.
- **D49** — Cron bỏ qua đơn đã Paid (tránh hủy đơn VNPay đã trả tiền).

### Khái niệm cần hiểu để bảo vệ

**Chữ ký VNPay (nơi dễ sai nhất — hội đồng có thể hỏi):**

1. **HMAC-SHA512 trên querystring đã sort + encode** — bám TUYỆT ĐỐI thuật toán demo VNPay: `sortObject` (sắp key alphabet, `encodeURIComponent` rồi `%20→+`), nối `key=value&...`, ký bằng hash secret. Dùng ĐÚNG chuỗi đó cho cả ký lẫn URL redirect — encode/sort lại lần nữa là sai chữ ký. Khóa thuật toán bằng test build→verify round-trip.
2. **verifyCallback** — bỏ `vnp_SecureHash` + `vnp_SecureHashType` ra rồi ký lại phần còn lại, so với chữ ký VNPay gửi. Khớp = dữ liệu chưa bị sửa trên đường truyền.
3. **Vì sao Return về BACKEND không phải FE** — giữ toàn bộ crypto + hash secret ở server; backend verify + cập nhật DB rồi mới redirect FE (FE không bao giờ thấy secret).

**Đối soát & an toàn tiền:**

4. **Server tự đối chiếu amount từ DB** (`vnp_Amount === Payment.amount × 100`) — không tin số tiền VNPay/client gửi. Chỉ Paid khi: chữ ký đúng + amount khớp + `vnp_ResponseCode='00' && vnp_TransactionStatus='00'`.
5. **Idempotent reconcile** — `updateMany({ where:{ txn_ref, status:'Pending' } })`: Return + IPN đều gọi (có thể gọi lại) nhưng chỉ lật Paid 1 lần. Cùng họ compare-and-set với D45/cancelOrder.
6. **IPN vs Return** — IPN là server→server (nguồn sự thật, cần URL công khai/ngrok), trả `{RspCode,Message}`; Return là trình duyệt user redirect về (chạy localhost), hiển thị kết quả. Cả hai đối soát chung 1 hàm nên thống nhất.
7. **payment status ≠ order status (D46)** — VNPay Paid không tự xác nhận đơn; admin vẫn xác nhận thủ công. Cron bỏ qua đơn đã Paid (D49) để không hủy nhầm đơn đã trả tiền.
8. **Payment tách bảng (D26)** — mỗi lần thử thanh toán = 1 row (txn_ref riêng); thất bại rồi thử lại tạo row mới, giữ được lịch sử mọi lần thử.

### Việc còn treo

- **Luồng VNPay UI thật** (nhập thẻ NCB + OTP trên trang sandbox) verify THỦ CÔNG khi bảo vệ — preview browser bị sandbox không đi ra domain ngoài; chữ ký URL đã được test khóa thuật toán nên VNPay sẽ chấp nhận. Thẻ test: NCB 9704198526191432198 / NGUYEN VAN A / 07/15 / OTP 123456.
- **IPN thật** cần ngrok/deploy (D18) — localhost dùng Return để demo.
- Refund khi hủy đơn VNPay đã Paid — NICE, ngoài scope.

### 🛑 CHECKPOINT — CORE end-to-end HOÀN TẤT

7 module CORE chạy thông: Auth → Catalog → Cart → Checkout → Order → Payment (COD + VNPay).
Khách đặt đơn được, trả tiền COD/VNPay, admin xác nhận → giao. Theo nguyên tắc checkpoint
(THIET-KE.md mục 8): quyết định nộp (polish) hay tiếp NICE tier.

---

## Code review vòng 6 — siết invariant thanh toán (2026-06-14)

> Review Phase 5: 3 Critical + 4 Major + 2 Minor quanh trạng thái thanh toán. Đã sửa +
> verify guard trên DB thật. 115/115 unit test xanh.

| # | Lỗi | Fix | Bài học |
|---|---|---|---|
| 1 | **COD order gọi được /vnpay/create** → tạo thêm Payment vnpay cho đơn đã có Payment cod → 2 phương thức / nguy cơ 2 lần thu | startVnpayPayment chặn nếu đơn có Payment `gateway:'cod'` → 400. Verify: COD → 400 | 1 đơn = 1 phương thức thanh toán; guard ngay cửa vào, không để 2 gateway lẫn lộn |
| 2 | **Hủy được đơn VNPay đã Paid** → hoàn kho nhưng tiền đã thu (refund ngoài scope) | cancelOrder thêm include `payments` + chặn `payments.some(Paid)` → 400. Guard TRONG transaction nên user/admin/cron đều không lách. Verify: cancel Paid → 400 | Invariant "đã thu tiền thì không tự hủy" phải ở tầng atomic, áp cho MỌI caller |
| 3 | **Admin xác nhận/giao đơn VNPay chưa thanh toán** | adminUpdateStatus chặn tiến bước nếu đơn là VNPay (`payments.some(gateway vnpay)`) và chưa Paid → 400. COD không chặn (thu khi giao). Verify: unpaid→400, paid→200 | Đơn trả trước phải Paid mới đi tiếp; đơn trả sau (COD) thì không — guard theo gateway |
| 4 | **reconcile báo success dù updateMany count=0** (race/đã Cancelled) | Kiểm `upd.count`: nếu 0 → re-read, status Paid → already_paid, khác → failed. Không báo success giả. Test count=0 → failed | "Đã ghi" phải xác nhận bằng count, không giả định update luôn thành công |
| 5 | **Tạo đơn VNPay rồi mới lỗi env** → order đã tạo, kho đã trừ, giỏ đã dọn | Controller `assertVnpayConfigured()` TRƯỚC createOrder khi payment_method=vnpay → fail sớm, chưa đụng DB | Validate điều kiện ngoại vi (env/config) trước khi bắt đầu side-effect không hoàn tác |
| 6 | **2 retry VNPay song song → 2 Payment Pending** | Tạo Payment retry trong `$transaction` + `SELECT ... FOR UPDATE` khóa dòng Order → request sau nối đuôi, thấy Pending vừa tạo → tái dùng. Đúng 1 Pending/đơn | Pessimistic lock (FOR UPDATE) trên "tài nguyên cha" serialize việc tạo con khi không có unique index phù hợp |
| 7 | **Cron `void fn()` không catch** → unhandled rejection nếu findMany lỗi | `fn().catch(logger.error)` ngoài vòng lặp | Promise chạy nền phải luôn có `.catch`, nếu không 1 lỗi DB làm sập tiến trình |
| 8 | (Minor) Admin detail hiện `payments[0]` (cũ) | Hiện `payments[last]` (lần thử mới nhất) + PAYMENT_STATUS_META | Khi có nhiều bản ghi attempt, luôn hiển thị bản mới nhất |
| 9 | (Minor) So chữ ký bằng `===` | `crypto.timingSafeEqual` (độ dài + nội dung) | So sánh HMAC nên timing-safe, tránh rò rỉ qua thời gian |

---

## Phase 6 — Email service (NICE tier) (2026-06-15)

### Mục tiêu phase

Tính năng NICE đầu tiên sau checkpoint: gửi email cho 3 tình huống — **xác nhận đơn hàng**,
**xác thực email** khi đăng ký, **quên/đặt lại mật khẩu**. Đây là tier NICE nên KHÔNG đụng
luồng CORE (chỉ thêm, không sửa nghiệp vụ đặt đơn). 1 migration nhỏ (cờ `email_verified` +
bảng `EmailToken`).

### Đã làm (6 lát)

| Lát | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | Hạ tầng: `lib/mailer.ts` (Resend, lazy config + `sendMail`/`sendMailSafe`), `lib/email-templates.ts` (renderEmail thuần), `.env` + `scripts/smoke-mailer.ts` | 7 unit test template; smoke test gửi email THẬT qua Resend OK (mã thư trả về) |
| 2 | Email xác nhận đơn: `modules/notification/order-email.ts` (build HTML thuần + nạp đơn theo mã), móc fire-and-forget sau `createOrder` trong order controller | 6 unit test build HTML (tiền VND, COD/VNPay, escape) |
| 3 | Migration `email_verified` + bảng `EmailToken`; `lib/email-token.ts` (sinh/hash/tiêu thụ); đăng ký gửi mail verify; route `POST /auth/verify-email` + `/resend-verification` | 5 unit test token (hash, lưu hash không lưu raw, compare-and-set) |
| 4 | Quên/đặt lại mật khẩu: `forgotPassword` (anti-enumeration) + `resetPassword`; route `/auth/forgot-password` + `/reset-password`; email reset | 4 unit test (3 ca anti-enumeration + hash mật khẩu mới) |
| 5 | FE: trang `/verify-email`, `/forgot-password`, `/reset-password`; banner nhắc xác thực ở Layout; link "Quên mật khẩu?" ở login; `api/auth` thêm 4 endpoint | build + lint xanh; browser: 3 trang render đúng, edge case thiếu token báo lỗi; curl 2 endpoint (verify rác→400, forgot lạ→200 chung) |
| 6 | Tài liệu: mục này + D50–D53 + CLAUDE.md + THUAT-NGU + cổng hiểu | 137 unit test BE xanh |

### Quyết định mới (chi tiết: THIET-KE.md mục 10)

- **D50** — Dùng **Resend** thay Nodemailer/Gmail (pivot D16): chỉ cần 1 API key, không phải bật 2FA + app-password.
- **D51** — Gửi mail **fail-soft**, luôn NGOÀI `$transaction`: email lỗi không bao giờ làm hỏng/chậm luồng chính.
- **D52** — **1 bảng `EmailToken`** cho cả verify + reset; DB lưu HASH; token dùng-một-lần + có hạn; tiêu thụ bằng compare-and-set.
- **D53** — `email_verified` **không chặn** đăng nhập/mua hàng (chỉ nhắc bằng banner); forgot-password chống dò tài khoản.

### Khái niệm cần hiểu để bảo vệ

**Hạ tầng email:**

1. **"Đường ống" mailer giấu nhà cung cấp** — mọi nơi chỉ gọi `sendMail`/`sendMailSafe`, không biết là Resend. Đổi sang Gmail/SES sau này chỉ sửa 1 file `lib/mailer.ts` (cùng tinh thần lib singleton vnpay/cloudinary). Cấu hình đọc lazy mỗi lần dùng (chắc dotenv đã nạp), thiếu key → fail rõ.
2. **`sendMail` vs `sendMailSafe`** — `sendMail` NÉM lỗi (dùng khi cần biết kết quả: smoke test). `sendMailSafe` NUỐT lỗi + log (dùng trong luồng nghiệp vụ): mạng/Resend trục trặc cũng không vỡ việc chính. Email luôn fire-and-forget (`void ...`), không `await` chặn response.
3. **HTML email phải inline style** — ứng dụng mail không nạp CSS ngoài; `renderEmail` ráp layout với style nhúng thẳng vào thẻ. `escapeHtml` cho text user nhập (tên, tiêu đề) chống chèn thẻ.
4. **Giới hạn Resend test** — người gửi `onboarding@resend.dev` CHỈ giao tới email chủ tài khoản Resend; gửi tự do cần verify domain. Demo gửi về chính email mình là đủ.

**Token an toàn (hội đồng có thể hỏi "link xác thực hoạt động sao"):**

5. **DB chỉ lưu HASH của token** — token thật (64 hex ngẫu nhiên) chỉ nằm trong link email; DB lưu `sha256(token)`, GIỐNG `password_hash`. Lộ DB cũng không tái tạo được link. Lúc xác thực: hash token nhận được rồi so với DB.
6. **Tiêu thụ token = compare-and-set** — `updateMany({ where:{ token_hash, used_at:null, expires_at>now } }, { used_at:now })` rồi assert `count===1`. Bấm link 2 lần thì chỉ 1 lần thắng → idempotent (cùng họ trừ kho D45 / hủy đơn / reconcile VNPay). Hết hạn / đã dùng / sai → count=0 → 400.
7. **1 bảng cho 2 việc** — `EmailToken.type` phân biệt verify_email (hạn 24h) / reset_password (hạn 1h, ngắn hơn vì nhạy cảm hơn). Dùng string literal + import type-only (tránh lỗi Jest generated client — bài học Phase 4).

**Bảo mật flow tài khoản:**

8. **Quên mật khẩu chống dò tài khoản** — LUÔN trả CÙNG thông báo "Nếu email tồn tại..." dù email có hay không (giống login Phase 1). Chỉ thực gửi mail khi user tồn tại + có password (tài khoản OAuth tương lai không có pass để đặt lại).
9. **email_verified không khóa tài khoản (D53)** — verify là "nudge" qua banner, user vẫn dùng/mua được. Đơn giản hóa MVP; khóa tài khoản chưa verify là quyết định UX lớn hơn, để sau.
10. **Trade-off JWT thuần (nhắc lại Phase 1)** — đặt lại mật khẩu xong, token đăng nhập CŨ vẫn sống tới hết hạn 7d; thu hồi ngay cần RefreshToken (NICE).

### Việc còn treo

- **Luồng email THẬT** (đăng ký → mở mail → bấm link verify; quên mk → mở mail → đặt lại) verify THỦ CÔNG khi bảo vệ — như VNPay, preview không click hộ link trong mail được. Hạ tầng đã chứng minh bằng smoke test gửi mail thật + unit test logic + endpoint trả đúng.
- Refund/thu hồi token khi đổi mật khẩu (revoke JWT cũ) — NICE, ngoài scope.
- Email template có thể tách file riêng cho từng loại nếu nhiều thêm — hiện gộp đủ dùng.

---

## Code review vòng 7 — sau Phase 6 (2026-06-15)

> Review code email: 0 Critical, 2 Major + 1 vấn đề scope (M3) + 6 Minor. Đã sửa M1/M2/m1/m5
> + thêm 15 unit test (đặc biệt phủ cam kết "fail-soft" của mailer). 152/152 test xanh.

### Các lỗi đã sửa & bài học

| # | Lỗi | Fix | Bài học cần nhớ |
|---|---|---|---|
| M1 | **Timing oracle ở `forgotPassword`**: thông báo giống nhau (đúng) NHƯNG email tồn tại thì `await` gọi Resend (chậm vài trăm ms→giây), email không tồn tại trả ngay → đo độ trễ vẫn dò được tài khoản | Bỏ `await`: bọc tạo token + gửi mail trong IIFE `void (...)` fire-and-forget → thời gian phản hồi như nhau ở cả 2 nhánh (như `register` đã làm) | Chống dò tài khoản không chỉ là "thông báo giống nhau" mà còn phải **"thời gian giống nhau"** — side-channel qua độ trễ cũng rò thông tin |
| M2a | **Token cũ không bị vô hiệu**: mỗi lần forgot/resend tạo token mới mà link cũ vẫn sống → nhiều link reset hiệu lực song song | `createEmailToken` set `used_at` cho mọi token cùng `(user, type)` chưa dùng TRƯỚC khi tạo token mới, cả 2 trong 1 `$transaction` | Token nhạy cảm nên **chỉ link mới nhất còn tác dụng** — tạo cái mới thì thu hồi cái cũ, thu hẹp cửa sổ nếu link bị lộ |
| M2b | **Bảng `EmailToken` phình vô hạn** (token đã dùng/hết hạn không ai dọn) | Thêm `cleanupExpiredEmailTokens` (deleteMany token `used_at != null` hoặc hết hạn) vào chính cron 15 phút sẵn có | Dữ liệu "dùng xong là bỏ" cần job dọn định kỳ — tái dùng hạ tầng cron có sẵn, không dựng mới |
| m1 | **Email "Đặt hàng thành công 🎉" cho đơn VNPay CHƯA trả tiền** (mới Pending, có thể bị auto-hủy 24h) → gây hiểu nhầm | `buildOrderConfirmationEmail` đổi tiêu đề/subject theo `payment_method`: VNPay → "Đã nhận đơn — chờ thanh toán" + nhắc hoàn tất; COD → "Đặt hàng thành công" | Nội dung thông báo phải đúng TRẠNG THÁI THẬT tại thời điểm gửi, không dùng chung một câu cho 2 luồng khác nhau |
| m5 | **`token!.user_id` dùng non-null assertion** → nếu row bị xóa xen giữa (hiếm) ném 500 thay vì 400 | Check `if (!token) throw AppError(400)` thay cho `!` | Tránh non-null assertion ở chỗ có thể null thật dưới race — trả lỗi đúng nghĩa thay vì 500 |

### Test bổ sung (15 test)

- **mailer** (mới): `sendMailSafe` nuốt lỗi (Resend ném / trả error → `false`, không throw), bỏ qua khi thiếu key; `sendMail` ném lỗi khi thất bại / trả id khi OK. ← phủ cam kết fail-soft cốt lõi.
- **auth-email** (mới): URL `/verify-email` + `/reset-password` đúng `FRONTEND_ORIGIN` + token `encodeURIComponent`.
- **auth-verify.service** (mới): `verifyEmail` set `email_verified`; `resendVerification` chặn 400 (đã verify) / 404 (không có user); `register` lỗi gửi verify KHÔNG vỡ đăng ký.
- **email-token**: thêm ca claim count=1 nhưng `findUnique` null → 400 (m5); kiểm vô hiệu token cũ (M2a).
- **order-email**: VNPay không nói "thành công" mà nhắc thanh toán (m1).

### Ghi nhận nhưng HOÃN (đúng nguyên tắc — minor không chặn merge)

- **m2** — Không có cooldown gửi mail theo user; chỉ rate-limit IP chung (20 req/15p toàn `/api/auth/*`). 1 IP dội tối đa 20 thư/15p tới 1 hộp thư. Chấp nhận ở mức đồ án; cooldown per-email là NICE.
- **m3** — Token nằm trong query string `?token=` có thể rò qua Referer/log. Thực hành phổ biến + token dùng-một-lần nên rủi ro thấp; biết để nói khi bảo vệ.
- **m4** — `email_verified` "cũ" giữa các thiết bị: verify ở máy khác thì phiên cũ còn banner tới lần login sau (chưa có endpoint `/me` refresh). UX nhỏ, để Phase polish.
- **m6** — `frontendOrigin()` lặp ở 2 file notification; gom về 1 helper là dọn dẹp thuần, để sau.

### ⚠️ M3 — thay đổi `lib/vnpay.ts` KHÔNG thuộc Phase 6 (commit riêng)

Diff `vnpay.ts` (xóa `vnp_ExpireDate`, đổi cách tạo `vnp_CreateDate`) là **fix có chủ đích từ TRƯỚC** khi
bắt đầu Phase 6 (đã có trong `git status` lúc khởi đầu): bám đúng 12 tham số của code demo VNPay
chính thức — thêm `vnp_ExpireDate` gây "Sai chữ ký". Đây là thay đổi **hành vi thanh toán** (link
VNPay không còn tự hết hạn sau 15 phút; đơn vẫn được cron hủy sau 24h), KHÔNG liên quan email → phải
**commit RIÊNG** (Phase 5 follow-up), không trộn vào changeset Phase 6, để truy vết "vì sao sửa" khi bảo vệ.

---

## Phase 7 — Voucher + VoucherUsage (NICE tier) (2026-06-15)

### Mục tiêu phase

Mã giảm giá: user nhập mã khi checkout để bớt tiền, admin quản lý mã. 2 loại giảm
(% có trần + số tiền cố định) trên subtotal; mỗi user dùng 1 mã tối đa N lần (bảng
`VoucherUsage`). 1 migration (Voucher + VoucherUsage + `Order.voucher_id`). Ngoài scope:
free-ship voucher, cộng dồn nhiều mã.

### Đã làm (6 lát)

| Lát | Nội dung | Kết quả xác minh |
|---|---|---|
| 1 | Migration Voucher+VoucherUsage+`Order.voucher_id`; `lib/voucher.ts` `calcDiscount` thuần; seed 2 mã (WELCOME10, SALE20K) | 5 unit test calcDiscount; seed idempotent |
| 2 | `modules/voucher` `validateVoucher` (đủ luật) + `POST /vouchers/preview` (auth, subtotal từ giỏ DB) | 8 unit test từng nhánh từ chối; **curl thật**: WELCOME10→giảm 22k, SALE20K→20k, mã rác→400 |
| 3 | Tích hợp `createOrder` (trừ discount, snapshot code/id, compare-and-set used_count, log VoucherUsage) + `cancelOrder` (hoàn) | 6 unit test (áp mã, hết lượt 409 rollback, hủy hoàn lượt) |
| 4 | Admin CRUD voucher (list/create/update/toggle/delete) | 6 unit test (chuẩn hóa code, trùng 409, chặn xóa khi có đơn) |
| 5 | FE: ô mã + preview ở Checkout (dòng giảm + cập nhật tổng) + AdminVouchersPage + sidebar + route | **browser**: admin page hiện 2 mã đúng; áp WELCOME10 → "Giảm giá -22.000đ", tổng 240k→218k |
| 6 | Tài liệu: mục này + D54–D56 + THUAT-NGU + CLAUDE.md + cổng hiểu | 177 unit test BE xanh; build+lint FE xanh |

### Quyết định mới (chi tiết: THIET-KE.md mục 10)

- **D54** — 2 loại giảm (% trần + cố định) trừ vào subtotal; SNAPSHOT `voucher_code`+`discount_amount`, `voucher_id` chỉ để analytics/hoàn lượt. 1 mã/đơn.
- **D55** — `used_count` tăng/hoàn ATOMIC bằng compare-and-set (cùng họ trừ kho D45); per_user_limit đếm VoucherUsage.
- **D56** — `validateVoucher` dùng chung preview + createOrder; server tự lấy subtotal (D40); chặn xóa voucher đã có đơn (tắt thay vì xóa, như D36).

### Khái niệm cần hiểu để bảo vệ

**Tính tiền & SNAPSHOT (D54):**

1. **Công thức total** — `total = subtotal − discount + shipping_fee`. `calcDiscount` THUẦN: %
   thì `floor(subtotal×value/100)` chặn trần `max_discount`; cố định thì đúng value; LUÔN clamp
   `≤ subtotal` (không giảm quá tiền hàng). Nguồn sự thật duy nhất cho cả preview lẫn đặt đơn.
2. **Snapshot voucher** — Order lưu `voucher_code` (text) + `discount_amount` (số đã giảm). Xóa/sửa
   voucher sau này thì đơn cũ vẫn đọc đúng. `voucher_id` FK chỉ để phân tích + để hủy đơn biết
   hoàn lượt cho mã nào — KHÔNG đọc lại giá trị giảm từ đó (cùng tinh thần OrderItem snapshot — D25).

**Server tự tính, không tin client (D40/D56):**

3. **Preview chỉ để hiển thị** — `POST /vouchers/preview` tự lấy subtotal từ GIỎ DB (không nhận số
   tiền client gửi), validate + trả discount. FE hiện dòng "Giảm giá". Nhưng số này KHÔNG được tin:
   `createOrder` **validate lại + tính lại** discount trong transaction. Sửa JS đổi discount ở FE
   vô dụng — đơn chốt theo server.
4. **Thứ tự kiểm trong `validateVoucher`** — tồn tại → đang bật → chưa hết hạn → đạt min_order →
   còn lượt tổng → user chưa vượt per_user_limit. Mỗi luật 1 message tiếng Việt. Gộp "không tồn tại"
   và "đã tắt" thành 1 message để không lộ mã nào có thật.

**Concurrency (D55 — hội đồng có thể hỏi "2 người giành mã cuối"):**

5. **used_count compare-and-set** — tăng lượt bằng `updateMany({ where:{ id, used_count:{ lt:
   usage_limit } }, data:{ increment } })` rồi assert `count===1`, NẰM TRONG transaction createOrder.
   2 đơn giành lượt cuối song song → chỉ 1 câu update khớp (count=1), đơn kia count=0 → 409 → rollback
   cả đơn lẫn trừ kho. Y hệt bài học trừ kho D45 / hủy đơn / reconcile VNPay.
6. **Hủy đơn hoàn lượt** — đơn có `voucher_id` → giảm `used_count` + xóa VoucherUsage của đơn, chỉ
   "người thắng" compare-and-set hủy chạy tới (idempotent, không hoàn 2 lần — như hoàn kho).
7. **per_user_limit RACE-SAFE (sửa ở review vòng 8)** — `validateVoucher` đếm VoucherUsage ngoài tx
   chỉ để báo lỗi đẹp SỚM. Chống race thật nằm TRONG tx: câu `updateMany` tăng `used_count` GIỮ KHÓA
   DÒNG voucher (row lock tới hết tx) → 2 đơn cùng user song song bị serialize; đếm lại VoucherUsage
   NGAY SAU (trong tx, đã giữ khóa) thấy được lần dùng đã commit của request thắng → request sau vượt
   per_user_limit thì 409 rollback. Đúng cho cả `per_user_limit=1` (vd WELCOME10) lẫn >1. Cùng họ
   pessimistic-lock FOR UPDATE đã dùng ở Phase 5 (retry VNPay) — chỉ khác là tái dùng luôn khóa của
   chính câu updateMany thay vì SELECT FOR UPDATE riêng.

**Admin (D56):**

8. **Chặn xóa voucher đã có đơn** — `deleteVoucher` đếm Order theo voucher_id, >0 thì 400 "tắt thay
   vì xóa" (giữ liên kết phân tích). Cùng tinh thần chặn xóa Author còn sách (D36). Mã hết dùng thì
   `toggle` is_active=false. Code chuẩn hóa UPPERCASE, trùng → 409.

### Việc còn treo

- Voucher chỉ giảm subtotal — free-ship voucher + cộng dồn nhiều mã là NICE ngoài scope.
- (MI1) FE chưa re-preview khi giỏ đổi giữa chừng: dòng "Giảm giá"/tổng có thể lệch nếu React Query
  refetch cart lúc focus tab (chỉ sai HIỂN THỊ — BE vẫn validate + tính lại lúc đặt). Checkout giỏ
  gần như cố định nên rủi ro thấp; để Phase polish.

## Code review vòng 8 — sau Phase 7 (2026-06-15)

> Review code voucher: 0 Critical, 1 Major + 4 Minor. Sửa MA1 (per_user_limit race) + MI2/MI3/MI4
> + thêm 5 unit test. 182/182 test xanh. MI1 hoãn (chỉ sai hiển thị).

| # | Lỗi | Fix | Bài học |
|---|---|---|---|
| MA1 | **per_user_limit KHÔNG an toàn dưới race** — dính cả `=1` (vd WELCOME10): 2 request cùng user song song đều qua `validateVoucher` (ngoài tx, userUsed=0) → dùng mã vượt giới hạn | Đếm lại VoucherUsage NGAY TRONG tx, SAU câu `updateMany` tăng used_count (câu này giữ khóa dòng voucher → serialize 2 đơn cùng user); vượt limit → 409 rollback | Check per-user phải ở NƠI GIỮ KHÓA (trong tx, sau khi lock hàng cha) mới chống race; đếm ngoài tx chỉ để báo lỗi đẹp. Tận dụng luôn khóa của updateMany sẵn có thay vì SELECT FOR UPDATE riêng |
| MI2 | **expire_at lệch múi giờ** — `new Date('YYYY-MM-DD')` = nửa đêm UTC → mã chết lúc 7h sáng VN (đầu ngày), sớm gần 1 ngày | FE build payload `new Date(`${date}T23:59:59`)` = CUỐI ngày theo giờ local | Date trơn 'YYYY-MM-DD' bị parse theo UTC; muốn "hết ngày X giờ địa phương" phải gắn giờ cuối ngày + để JS parse local |
| MI3 | **used_count decrement thiếu chặn sàn** | Đổi `update` → `updateMany({ where:{ id, used_count:{ gt:0 } } })` — không bao giờ ghi số âm dù invariant lỗi | Phép trừ trên cột đếm nên có guard sàn, phòng thủ rẻ |
| MI4 | Typo comment "Voucker" | "Voucher" | — |

### Test bổ sung (5)
- order.service: per_user_limit race (đếm trong tx >= limit → 409, không ghi usage thứ 2); cancel dùng updateMany guarded.
- voucher.service: `usage_limit=null` (không giới hạn tổng) vẫn qua; `previewVoucher` giỏ rỗng → 400 + trả đúng shape.
- voucher admin: `getVoucher` 404.

---

*(Phase 8+ NICE hoặc Phase 10 Polish/Deploy: sẽ ghi tiếp tại đây)*
