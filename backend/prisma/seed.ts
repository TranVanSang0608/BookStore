// =============================================================
// Seed dữ liệu ban đầu — chạy bằng: npx prisma db seed
// Script IDEMPOTENT (chạy lại nhiều lần không tạo trùng):
// dùng upsert / createMany skipDuplicates dựa trên các unique constraint.
//
// Seed gồm: địa giới 34 tỉnh + 3321 phường/xã (từ file JSON đóng băng),
// ShippingZone theo tỉnh, admin user, và catalog mẫu (category/author/book).
// =============================================================
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client';
import type { OrderStatus } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------- 1. Địa giới hành chính (Province + Ward) ----------

// Cấu trúc file vn-locations.json (provinces.open-api.vn v2, depth=2)
interface RawWard {
  code: number;
  name: string;
  province_code: number;
}
interface RawProvince {
  code: number;
  name: string;
  wards: RawWard[];
}

async function seedLocations() {
  const file = path.join(__dirname, 'data', 'vn-locations.json');
  const provinces: RawProvince[] = JSON.parse(fs.readFileSync(file, 'utf-8'));

  await prisma.province.createMany({
    data: provinces.map((p) => ({ code: String(p.code), name: p.name })),
    skipDuplicates: true,
  });

  await prisma.ward.createMany({
    data: provinces.flatMap((p) =>
      p.wards.map((w) => ({
        code: String(w.code),
        name: w.name,
        province_code: String(p.code),
      })),
    ),
    skipDuplicates: true,
  });

  console.log(`✔ Địa giới: ${provinces.length} tỉnh, ${provinces.reduce((s, p) => s + p.wards.length, 0)} phường/xã`);
  return provinces;
}

// ---------- 2. ShippingZone — phí ship theo tỉnh ----------

async function seedShippingZones(provinces: RawProvince[]) {
  // Nội thành 2 đô thị lớn ship rẻ hơn; mọi zone đều free ship cho đơn từ 300.000đ
  const isBigCity = (name: string) => name.includes('Hà Nội') || name.includes('Hồ Chí Minh');

  await prisma.shippingZone.createMany({
    data: provinces.map((p) => ({
      province_code: String(p.code),
      fee: isBigCity(p.name) ? 20_000 : 35_000,
      free_threshold: 300_000,
    })),
    skipDuplicates: true,
  });

  console.log(`✔ ShippingZone: ${provinces.length} zone (20k nội thành lớn / 35k tỉnh khác, free từ 300k)`);
}

// ---------- 3. Admin user ----------

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@bookstore.vn';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';

  // bcrypt cost 10: cân bằng giữa an toàn và tốc độ login
  const password_hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {}, // đã tồn tại thì giữ nguyên (không reset password mỗi lần seed)
    create: { email, password_hash, name: 'Quản trị viên', role: 'admin' },
  });

  console.log(`✔ Admin: ${email} (đổi password mặc định trước khi deploy!)`);
}

// ---------- 4. Catalog mẫu: Category, Author, Book ----------

const CATEGORIES = [
  { name: 'Văn học', slug: 'van-hoc' },
  { name: 'Thiếu nhi', slug: 'thieu-nhi' },
  { name: 'Kỹ năng sống', slug: 'ky-nang-song' },
  { name: 'Kinh tế', slug: 'kinh-te' },
  { name: 'Tâm lý', slug: 'tam-ly' },
  { name: 'Khoa học', slug: 'khoa-hoc' },
  { name: 'Lịch sử', slug: 'lich-su' },
  { name: 'Truyện tranh', slug: 'truyen-tranh' },
];

const AUTHORS = [
  'Nguyễn Nhật Ánh',
  'Tô Hoài',
  'Dale Carnegie',
  'Paulo Coelho',
  'Rosie Nguyễn',
  'Yuval Noah Harari',
];

// slug sách là unique key để upsert; price đơn vị đồng (VND)
const BOOKS = [
  { title: 'Mắt Biếc', slug: 'mat-biec', author: 'Nguyễn Nhật Ánh', price: 110_000, stock: 50, categories: ['van-hoc'], description: 'Tiểu thuyết về mối tình đơn phương của Ngạn dành cho Hà Lan, từ làng Đo Đo đến thành phố.' },
  { title: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ', slug: 'cho-toi-xin-mot-ve-di-tuoi-tho', author: 'Nguyễn Nhật Ánh', price: 80_000, stock: 60, categories: ['van-hoc', 'thieu-nhi'], description: 'Chuyến tàu về tuổi thơ qua góc nhìn của cu Mùi và nhóm bạn thân.' },
  { title: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', slug: 'toi-thay-hoa-vang-tren-co-xanh', author: 'Nguyễn Nhật Ánh', price: 125_000, stock: 40, categories: ['van-hoc'], description: 'Tuổi thơ nghèo khó mà trong trẻo ở một làng quê miền Trung.' },
  { title: 'Kính Vạn Hoa (Tập 1)', slug: 'kinh-van-hoa-tap-1', author: 'Nguyễn Nhật Ánh', price: 55_000, stock: 80, categories: ['thieu-nhi'], description: 'Những câu chuyện học trò dí dỏm của bộ ba Quý ròm, Tiểu Long và nhỏ Hạnh.' },
  { title: 'Dế Mèn Phiêu Lưu Ký', slug: 'de-men-phieu-luu-ky', author: 'Tô Hoài', price: 65_000, stock: 70, categories: ['thieu-nhi', 'van-hoc'], description: 'Cuộc phiêu lưu của chú Dế Mèn qua thế giới loài vật — tác phẩm kinh điển của văn học thiếu nhi Việt Nam.' },
  { title: 'Đắc Nhân Tâm', slug: 'dac-nhan-tam', author: 'Dale Carnegie', price: 86_000, stock: 100, categories: ['ky-nang-song'], description: 'Nghệ thuật thu phục lòng người — cuốn sách kỹ năng bán chạy nhất mọi thời đại.' },
  { title: 'Quẳng Gánh Lo Đi Và Vui Sống', slug: 'quang-ganh-lo-di-va-vui-song', author: 'Dale Carnegie', price: 90_000, stock: 55, categories: ['ky-nang-song', 'tam-ly'], description: 'Phương pháp loại bỏ lo âu và sống an nhiên giữa áp lực thường ngày.' },
  { title: 'Nhà Giả Kim', slug: 'nha-gia-kim', author: 'Paulo Coelho', price: 79_000, stock: 90, categories: ['van-hoc'], description: 'Hành trình theo đuổi vận mệnh của chàng chăn cừu Santiago.' },
  { title: 'Veronika Quyết Chết', slug: 'veronika-quyet-chet', author: 'Paulo Coelho', price: 98_000, stock: 30, categories: ['van-hoc', 'tam-ly'], description: 'Câu chuyện về giá trị của sự sống qua bảy ngày đặc biệt của Veronika.' },
  { title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', slug: 'tuoi-tre-dang-gia-bao-nhieu', author: 'Rosie Nguyễn', price: 90_000, stock: 65, categories: ['ky-nang-song'], description: 'Học, làm, đi — ba trụ cột để tuổi trẻ không trôi qua lãng phí.' },
  { title: 'Sapiens: Lược Sử Loài Người', slug: 'sapiens-luoc-su-loai-nguoi', author: 'Yuval Noah Harari', price: 299_000, stock: 25, categories: ['khoa-hoc', 'lich-su'], description: 'Lịch sử loài người từ cách mạng nhận thức đến cách mạng khoa học.' },
  { title: 'Homo Deus: Lược Sử Tương Lai', slug: 'homo-deus-luoc-su-tuong-lai', author: 'Yuval Noah Harari', price: 269_000, stock: 25, categories: ['khoa-hoc'], description: 'Tương lai nhân loại khi công nghệ và dữ liệu định hình lại xã hội.' },
];

async function seedCatalog() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`✔ Category: ${CATEGORIES.length}`);

  // Author không có cột unique → tự kiểm tra theo name trước khi tạo
  const authorIds = new Map<string, number>();
  for (const name of AUTHORS) {
    const existing = await prisma.author.findFirst({ where: { name } });
    const author = existing ?? (await prisma.author.create({ data: { name } }));
    authorIds.set(name, author.id);
  }
  console.log(`✔ Author: ${AUTHORS.length}`);

  for (const b of BOOKS) {
    const book = await prisma.book.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        title: b.title,
        slug: b.slug,
        description: b.description,
        price: b.price,
        stock_quantity: b.stock,
        author_id: authorIds.get(b.author)!,
      },
    });

    // Gắn thể loại qua bảng junction (composite PK chặn trùng)
    const categories = await prisma.category.findMany({ where: { slug: { in: b.categories } } });
    await prisma.bookCategory.createMany({
      data: categories.map((c) => ({ book_id: book.id, category_id: c.id })),
      skipDuplicates: true,
    });
  }
  console.log(`✔ Book: ${BOOKS.length}`);
}

// ---------- 5. Voucher mẫu (Phase 7) ----------

async function seedVouchers() {
  // upsert theo code (unique) → idempotent. expire_at để trống = không hết hạn (demo còn hiệu lực).
  const vouchers = [
    {
      code: 'WELCOME10',
      discount_type: 'percentage' as const,
      discount_value: 10, // giảm 10%
      min_order: 0,
      max_discount: 50_000, // trần giảm 50k
      usage_limit: 1000,
      per_user_limit: 1,
    },
    {
      code: 'SALE20K',
      discount_type: 'fixed' as const,
      discount_value: 20_000, // giảm 20.000đ
      min_order: 200_000, // đơn từ 200k mới áp dụng
      max_discount: null,
      usage_limit: 500,
      per_user_limit: 3,
    },
  ];

  for (const v of vouchers) {
    await prisma.voucher.upsert({ where: { code: v.code }, update: {}, create: v });
  }
  console.log(`✔ Voucher: ${vouchers.length} mã mẫu (WELCOME10 10% trần 50k / SALE20K -20k đơn từ 200k)`);
}

// ---------- 6. Dữ liệu demo: khách hàng + đơn hàng + review ----------
// MỤC ĐÍCH: để khối "Bán chạy" (xếp theo lượng bán đơn Delivered) và sao đánh giá trên
// thẻ sách CÓ DỮ LIỆU THẬT khi demo trước hội đồng — không khối nào hiển thị rỗng/bịa.
// IDEMPOTENT: user upsert theo email; đơn BỎ QUA nếu order_code đã có; review upsert theo (user,book).
// CỐ Ý KHÔNG: seed ảnh bìa (ảnh thật upload qua admin) + KHÔNG trừ stock (giữ idempotent;
// bestseller chỉ đếm quantity trong OrderItem nên không phụ thuộc stock).

const DEMO_PASSWORD = 'Demo@123';

const DEMO_CUSTOMERS = [
  { email: 'khach1@bookstore.vn', name: 'Lan Phương', city: 'Hồ Chí Minh' },
  { email: 'khach2@bookstore.vn', name: 'Minh Quân', city: 'Hà Nội' },
];

// Đơn demo: 5 Delivered (nuôi "Bán chạy") + 1 Shipping + 1 Pending (cho đủ trạng thái).
// daysAgo: đặt placed_at lùi về quá khứ để biểu đồ doanh thu/tháng có dữ liệu rải đều.
const DEMO_ORDERS: {
  code: string;
  customer: string;
  status: OrderStatus;
  daysAgo: number;
  items: { slug: string; qty: number }[];
}[] = [
  { code: 'BK-DEMO-0001', customer: 'khach1@bookstore.vn', status: 'Delivered', daysAgo: 40, items: [{ slug: 'dac-nhan-tam', qty: 5 }, { slug: 'nha-gia-kim', qty: 3 }, { slug: 'mat-biec', qty: 2 }] },
  { code: 'BK-DEMO-0002', customer: 'khach2@bookstore.vn', status: 'Delivered', daysAgo: 30, items: [{ slug: 'dac-nhan-tam', qty: 4 }, { slug: 'tuoi-tre-dang-gia-bao-nhieu', qty: 3 }, { slug: 'sapiens-luoc-su-loai-nguoi', qty: 2 }] },
  { code: 'BK-DEMO-0003', customer: 'khach1@bookstore.vn', status: 'Delivered', daysAgo: 20, items: [{ slug: 'nha-gia-kim', qty: 4 }, { slug: 'tuoi-tre-dang-gia-bao-nhieu', qty: 3 }, { slug: 'toi-thay-hoa-vang-tren-co-xanh', qty: 2 }] },
  { code: 'BK-DEMO-0004', customer: 'khach2@bookstore.vn', status: 'Delivered', daysAgo: 12, items: [{ slug: 'dac-nhan-tam', qty: 3 }, { slug: 'nha-gia-kim', qty: 2 }, { slug: 'cho-toi-xin-mot-ve-di-tuoi-tho', qty: 2 }, { slug: 'mat-biec', qty: 3 }] },
  { code: 'BK-DEMO-0005', customer: 'khach1@bookstore.vn', status: 'Delivered', daysAgo: 7, items: [{ slug: 'sapiens-luoc-su-loai-nguoi', qty: 4 }, { slug: 'tuoi-tre-dang-gia-bao-nhieu', qty: 2 }, { slug: 'de-men-phieu-luu-ky', qty: 3 }, { slug: 'cho-toi-xin-mot-ve-di-tuoi-tho', qty: 2 }] },
  { code: 'BK-DEMO-0006', customer: 'khach1@bookstore.vn', status: 'Shipping', daysAgo: 3, items: [{ slug: 'homo-deus-luoc-su-tuong-lai', qty: 1 }, { slug: 'veronika-quyet-chet', qty: 1 }] },
  { code: 'BK-DEMO-0007', customer: 'khach2@bookstore.vn', status: 'Pending', daysAgo: 1, items: [{ slug: 'quang-ganh-lo-di-va-vui-song', qty: 2 }] },
];

// Review demo — mỗi dòng PHẢI ứng với 1 đơn Delivered chứa sách đó (verified purchase D5).
const DEMO_REVIEWS = [
  { customer: 'khach1@bookstore.vn', slug: 'dac-nhan-tam', rating: 5, comment: 'Sách kỹ năng kinh điển, áp dụng được ngay vào giao tiếp hằng ngày.' },
  { customer: 'khach1@bookstore.vn', slug: 'nha-gia-kim', rating: 5, comment: 'Truyền cảm hứng theo đuổi ước mơ, đọc một mạch không dừng được.' },
  { customer: 'khach1@bookstore.vn', slug: 'mat-biec', rating: 4, comment: 'Văn Nguyễn Nhật Ánh nhẹ nhàng mà buồn man mác.' },
  { customer: 'khach1@bookstore.vn', slug: 'sapiens-luoc-su-loai-nguoi', rating: 5, comment: 'Góc nhìn lớn và mạch lạc về lịch sử loài người.' },
  { customer: 'khach2@bookstore.vn', slug: 'dac-nhan-tam', rating: 4, comment: 'Nhiều lời khuyên hữu ích, vài ví dụ hơi cũ nhưng vẫn đáng đọc.' },
  { customer: 'khach2@bookstore.vn', slug: 'tuoi-tre-dang-gia-bao-nhieu', rating: 5, comment: 'Rất hợp với các bạn trẻ đang loay hoay tìm hướng đi.' },
  { customer: 'khach2@bookstore.vn', slug: 'nha-gia-kim', rating: 5, comment: 'Một câu chuyện đẹp về việc lắng nghe trái tim mình.' },
  { customer: 'khach2@bookstore.vn', slug: 'sapiens-luoc-su-loai-nguoi', rating: 4, comment: 'Kiến thức bổ ích, hơi dày nhưng cuốn.' },
];

async function seedDemoData() {
  // --- 6a. Khách hàng demo + địa chỉ mặc định ---
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const customerIds = new Map<string, number>();

  for (const c of DEMO_CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {}, // đã có thì giữ nguyên (không reset mỗi lần seed)
      create: { email: c.email, password_hash, name: c.name, role: 'user', email_verified: true },
    });
    customerIds.set(c.email, user.id);

    // Address không có cột unique → guard bằng "đã có địa chỉ chưa" để khỏi tạo trùng
    const hasAddress = await prisma.address.findFirst({ where: { user_id: user.id } });
    if (!hasAddress) {
      const province = await prisma.province.findFirst({
        where: { name: { contains: c.city } },
        include: { wards: { take: 1 } },
      });
      if (province && province.wards[0]) {
        await prisma.address.create({
          data: {
            user_id: user.id,
            recipient_name: c.name,
            phone: '0900000000',
            province_code: province.code,
            ward_code: province.wards[0].code,
            province_name: province.name,
            ward_name: province.wards[0].name,
            street_detail: 'Số 1 Đường Sách',
            is_default: true,
          },
        });
      }
    }
  }
  console.log(`✔ Khách demo: ${DEMO_CUSTOMERS.length} (mật khẩu chung: ${DEMO_PASSWORD})`);

  // --- 6b. Đơn hàng demo (snapshot từ giá HIỆN TẠI — đủ cho demo) ---
  const books = await prisma.book.findMany({ include: { author: true } });
  const bookBySlug = new Map(books.map((b) => [b.slug, b]));
  const isBigCity = (name: string) => name.includes('Hà Nội') || name.includes('Hồ Chí Minh');

  let createdOrders = 0;
  for (const o of DEMO_ORDERS) {
    // Idempotent: đã có order_code này thì bỏ qua cả đơn lẫn các dòng hàng của nó
    if (await prisma.order.findUnique({ where: { order_code: o.code } })) continue;

    const userId = customerIds.get(o.customer)!;
    const address = await prisma.address.findFirst({ where: { user_id: userId } });
    if (!address) continue;

    const lines = o.items
      .map(({ slug, qty }) => ({ book: bookBySlug.get(slug), qty }))
      .filter((l): l is { book: (typeof books)[number]; qty: number } => l.book !== undefined);

    // Tiền tính giống createOrder: subtotal từ giá DB, free ship từ 300k (khớp seedShippingZones)
    const subtotal = lines.reduce((s, l) => s + l.book.price * l.qty, 0);
    const shipping_fee = subtotal >= 300_000 ? 0 : isBigCity(address.province_name) ? 20_000 : 35_000;

    await prisma.order.create({
      data: {
        order_code: o.code,
        user_id: userId,
        status: o.status,
        subtotal,
        shipping_fee,
        discount_amount: 0,
        total: subtotal + shipping_fee,
        placed_at: new Date(Date.now() - o.daysAgo * 24 * 60 * 60 * 1000),
        shipping_recipient_name: address.recipient_name,
        shipping_phone: address.phone,
        shipping_province_name: address.province_name,
        shipping_ward_name: address.ward_name,
        shipping_street: address.street_detail,
        // Snapshot từng dòng hàng (giống createOrder) — bìa hiện null, sẽ có khi upload ảnh thật
        items: {
          create: lines.map((l) => ({
            book_id: l.book.id,
            book_title: l.book.title,
            book_author_name: l.book.author.name,
            price_at_order: l.book.price,
            cover_image_url_snapshot: l.book.cover_image_url,
            quantity: l.qty,
          })),
        },
      },
    });
    createdOrders++;
  }
  console.log(`✔ Đơn demo: +${createdOrders} đơn mới / ${DEMO_ORDERS.length} định nghĩa (5 Delivered + 1 Shipping + 1 Pending)`);

  // --- 6c. Review (chỉ ghi nếu THẬT SỰ có đơn Delivered chứa sách — đúng verified purchase) ---
  let reviewCount = 0;
  const affectedBookIds = new Set<number>();
  for (const r of DEMO_REVIEWS) {
    const userId = customerIds.get(r.customer)!;
    const book = bookBySlug.get(r.slug);
    if (!book) continue;

    const purchased = await prisma.order.findFirst({
      where: { user_id: userId, status: 'Delivered', items: { some: { book_id: book.id } } },
    });
    if (!purchased) continue; // an toàn: không có đơn Delivered thì bỏ qua, không tạo review "ảo"

    await prisma.review.upsert({
      where: { user_id_book_id: { user_id: userId, book_id: book.id } },
      update: { rating: r.rating, comment: r.comment },
      create: { user_id: userId, book_id: book.id, rating: r.rating, comment: r.comment },
    });
    affectedBookIds.add(book.id);
    reviewCount++;
  }

  // Tính lại avg_rating + review_count denormalized lên Book (giống recomputeBookRating của review service)
  for (const bookId of affectedBookIds) {
    const agg = await prisma.review.aggregate({ where: { book_id: bookId }, _avg: { rating: true }, _count: true });
    await prisma.book.update({
      where: { id: bookId },
      data: { avg_rating: agg._avg.rating ?? 0, review_count: agg._count },
    });
  }
  console.log(`✔ Review demo: ${reviewCount} review (cập nhật sao cho ${affectedBookIds.size} sách)`);
}

// ---------- main ----------

async function main() {
  const provinces = await seedLocations();
  await seedShippingZones(provinces);
  await seedAdmin();
  await seedCatalog();
  await seedVouchers();
  await seedDemoData();
}

main()
  .then(() => console.log('🌱 Seed hoàn tất'))
  .catch((e) => {
    console.error('Seed thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
