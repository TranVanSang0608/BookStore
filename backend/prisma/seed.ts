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

// ---------- main ----------

async function main() {
  const provinces = await seedLocations();
  await seedShippingZones(provinces);
  await seedAdmin();
  await seedCatalog();
  await seedVouchers();
}

main()
  .then(() => console.log('🌱 Seed hoàn tất'))
  .catch((e) => {
    console.error('Seed thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
