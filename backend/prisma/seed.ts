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

const DEFAULT_ADMIN_PASSWORD = 'Admin@123'; // CHỈ dùng cho dev — production bị chặn (xem dưới)

async function seedAdmin() {
  const isProd = process.env.NODE_ENV === 'production';
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@bookstore.vn';
  const envPassword = process.env.SEED_ADMIN_PASSWORD;

  // BẢO MẬT: ở production BẮT BUỘC tự đặt SEED_ADMIN_PASSWORD mạnh — KHÔNG cho rơi vào
  // mật khẩu mặc định (nếu không ai cũng thử đăng nhập admin@bookstore.vn / Admin@123 để chiếm quyền).
  // Dev vẫn cho dùng default cho tiện. Chặn từ chối seed nếu prod mà password yếu/mặc định.
  if (isProd && (!envPassword || envPassword.length < 8 || envPassword === DEFAULT_ADMIN_PASSWORD)) {
    throw new Error(
      'Từ chối seed: production phải đặt SEED_ADMIN_PASSWORD mạnh (>= 8 ký tự, khác mật khẩu mặc định) trong .env.',
    );
  }

  const password = envPassword ?? DEFAULT_ADMIN_PASSWORD;

  // bcrypt cost 10: cân bằng giữa an toàn và tốc độ login
  const password_hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    // Có SEED_ADMIN_PASSWORD (env) → CẬP NHẬT hash + tăng token_version (vô hiệu token cũ) khi chạy
    // lại seed: đổi env password rồi seed lại thì mật khẩu THỰC SỰ đổi (không kẹt hash cũ). Không có
    // env (dev default) → giữ nguyên, không reset mỗi lần seed.
    update: envPassword ? { password_hash, token_version: { increment: 1 } } : {},
    create: { email, password_hash, name: 'Quản trị viên', role: 'admin' },
  });

  const usingDefault = !envPassword;
  console.log(
    `✔ Admin: ${email}${usingDefault ? ' (mật khẩu MẶC ĐỊNH — chỉ dùng cho dev, ĐỔI trước khi deploy!)' : ''}`,
  );
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
  // có sẵn từ trước
  'Nguyễn Nhật Ánh', 'Tô Hoài', 'Dale Carnegie', 'Paulo Coelho', 'Rosie Nguyễn', 'Yuval Noah Harari',
  // bổ sung Phase 10
  'Vũ Trọng Phụng', 'Nam Cao', 'Ngô Tất Tố', 'Bảo Ninh', 'Nguyễn Ngọc Tư', 'Nguyễn Du',
  'Antoine de Saint-Exupéry', 'Ayn Rand', 'Ernest Hemingway', 'Victor Hugo', 'Gabriel García Márquez',
  'Haruki Murakami', 'F. Scott Fitzgerald', 'Kuroyanagi Tetsuko', 'Luis Sepúlveda', 'Hector Malot',
  'Phùng Quán', 'Trần Đăng Khoa', 'Adam Khoo', 'Stephen Covey', 'Robin Sharma', 'Trác Nhã',
  'David J. Lieberman', 'Charles Duhigg', 'Robert Kiyosaki', 'George S. Clason', 'Napoleon Hill',
  'Eric Ries', 'Daniel Kahneman', 'Minh Niệm', 'Nguyên Phong', 'Kishimi Ichiro', 'Eckhart Tolle',
  'Stephen Hawking', 'Richard Dawkins', 'Trần Trọng Kim', 'Jared Diamond', 'Fujiko F. Fujio',
  'Aoyama Gosho', 'Lê Linh', 'Eiichiro Oda',
  // bổ sung Phase 11 — sách kinh điển (văn học VN & thế giới)
  'Nguyễn Tuân', 'Thạch Lam', 'Nguyên Hồng', 'Lev Tolstoy', 'Fyodor Dostoevsky', 'Mario Puzo',
  'Margaret Mitchell', 'Jane Austen', 'Harper Lee', 'George Orwell', 'Jack London', 'J.D. Salinger',
  // thiếu nhi
  'Astrid Lindgren', 'Edmondo De Amicis', 'Lewis Carroll', 'Hans Christian Andersen', 'Roald Dahl',
  'Nguyễn Ngọc Thuần', 'J.K. Rowling',
  // kỹ năng sống & kinh tế
  'Tony Buổi Sáng', 'Og Mandino', 'Chung Ju Yung', 'James Clear', 'Mark Manson',
  'Benjamin Graham', 'Jim Collins', 'Phil Knight', 'Malcolm Gladwell', 'Dan Ariely',
  // tâm lý & khoa học
  'Viktor Frankl', 'Daniel Goleman', 'Thích Nhất Hạnh', 'Hae Min', 'Paul Kalanithi',
  'Carl Sagan', 'Charles Darwin', 'Carlo Rovelli', 'Bill Bryson',
  // lịch sử / cổ điển Trung Hoa & truyện tranh
  'La Quán Trung', 'Ngô Thừa Ân', 'Tư Mã Thiên',
  'Masashi Kishimoto', 'Akira Toriyama', 'Yoshito Usui',
];

// slug sách là unique key để upsert; price đơn vị đồng (VND).
// publisher/published_year/pages tuỳ chọn — đổ vào tab "Thông tin" trang chi tiết cho đầy đặn.
type SeedBook = {
  title: string;
  slug: string;
  author: string;
  price: number;
  stock: number;
  categories: string[];
  description: string;
  publisher?: string;
  published_year?: number;
  pages?: number;
};
const BOOKS: SeedBook[] = [
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

  // ===== Sách mẫu bổ sung (Phase 10 — cho cửa hàng đầy đặn khi demo) =====
  // -- Văn học --
  { title: 'Số Đỏ', slug: 'so-do', author: 'Vũ Trọng Phụng', price: 75_000, stock: 50, categories: ['van-hoc'], description: 'Tiểu thuyết trào phúng kinh điển về Xuân Tóc Đỏ và xã hội thượng lưu lố lăng đầu thế kỷ 20.', publisher: 'NXB Văn Học', published_year: 2020, pages: 260 },
  { title: 'Chí Phèo', slug: 'chi-pheo', author: 'Nam Cao', price: 65_000, stock: 45, categories: ['van-hoc'], description: 'Tuyển tập truyện ngắn Nam Cao — bi kịch của người nông dân bị tha hóa qua hình tượng Chí Phèo.', publisher: 'NXB Văn Học', published_year: 2019, pages: 220 },
  { title: 'Tắt Đèn', slug: 'tat-den', author: 'Ngô Tất Tố', price: 60_000, stock: 40, categories: ['van-hoc'], description: 'Số phận chị Dậu giữa sưu cao thuế nặng — bức tranh nông thôn Việt Nam trước Cách mạng.', publisher: 'NXB Văn Học', published_year: 2018, pages: 200 },
  { title: 'Nỗi Buồn Chiến Tranh', slug: 'noi-buon-chien-tranh', author: 'Bảo Ninh', price: 120_000, stock: 35, categories: ['van-hoc'], description: 'Ký ức chiến tranh ám ảnh của người lính Kiên — tác phẩm được dịch ra nhiều thứ tiếng.', publisher: 'NXB Trẻ', published_year: 2021, pages: 320 },
  { title: 'Cánh Đồng Bất Tận', slug: 'canh-dong-bat-tan', author: 'Nguyễn Ngọc Tư', price: 88_000, stock: 50, categories: ['van-hoc'], description: 'Những phận người trôi nổi nơi sông nước miền Tây Nam Bộ.', publisher: 'NXB Trẻ', published_year: 2022, pages: 215 },
  { title: 'Truyện Kiều', slug: 'truyen-kieu', author: 'Nguyễn Du', price: 95_000, stock: 60, categories: ['van-hoc'], description: 'Kiệt tác thơ Nôm về cuộc đời mười lăm năm lưu lạc của Thúy Kiều.', publisher: 'NXB Văn Học', published_year: 2020, pages: 400 },
  { title: 'Hoàng Tử Bé', slug: 'hoang-tu-be', author: 'Antoine de Saint-Exupéry', price: 68_000, stock: 80, categories: ['van-hoc', 'thieu-nhi'], description: 'Câu chuyện trong trẻo và sâu lắng về tình yêu, sự ngây thơ và những điều thật sự quan trọng.', publisher: 'Nhã Nam', published_year: 2022, pages: 120 },
  { title: 'Suối Nguồn', slug: 'suoi-nguon', author: 'Ayn Rand', price: 215_000, stock: 20, categories: ['van-hoc'], description: 'Hành trình của kiến trúc sư Howard Roark — đề cao chủ nghĩa cá nhân và sự chính trực.', publisher: 'NXB Trẻ', published_year: 2021, pages: 1200 },
  { title: 'Ông Già Và Biển Cả', slug: 'ong-gia-va-bien-ca', author: 'Ernest Hemingway', price: 72_000, stock: 40, categories: ['van-hoc'], description: 'Cuộc chiến đơn độc của ông lão Santiago với con cá kiếm khổng lồ giữa đại dương.', publisher: 'Nhã Nam', published_year: 2019, pages: 150 },
  { title: 'Những Người Khốn Khổ', slug: 'nhung-nguoi-khon-kho', author: 'Victor Hugo', price: 320_000, stock: 25, categories: ['van-hoc'], description: 'Bản trường ca về lòng nhân ái qua cuộc đời Jean Valjean trong xã hội Pháp thế kỷ 19.', publisher: 'NXB Văn Học', published_year: 2020, pages: 1700 },
  { title: 'Trăm Năm Cô Đơn', slug: 'tram-nam-co-don', author: 'Gabriel García Márquez', price: 175_000, stock: 30, categories: ['van-hoc'], description: 'Bảy thế hệ dòng họ Buendía ở làng Macondo — đỉnh cao của hiện thực huyền ảo.', publisher: 'Nhã Nam', published_year: 2021, pages: 500 },
  { title: 'Rừng Na Uy', slug: 'rung-na-uy', author: 'Haruki Murakami', price: 135_000, stock: 40, categories: ['van-hoc'], description: 'Tình yêu, mất mát và tuổi trẻ của Toru Watanabe ở Tokyo những năm 1960.', publisher: 'Nhã Nam', published_year: 2022, pages: 380 },
  { title: 'Đại Gia Gatsby', slug: 'dai-gia-gatsby', author: 'F. Scott Fitzgerald', price: 90_000, stock: 35, categories: ['van-hoc'], description: 'Giấc mơ Mỹ và sự phù phiếm của thời đại nhạc Jazz qua nhân vật Jay Gatsby.', publisher: 'Nhã Nam', published_year: 2020, pages: 240 },

  // -- Thiếu nhi --
  { title: 'Totto-chan Bên Cửa Sổ', slug: 'totto-chan-ben-cua-so', author: 'Kuroyanagi Tetsuko', price: 98_000, stock: 60, categories: ['thieu-nhi'], description: 'Ngôi trường Tomoe đặc biệt và tuổi thơ hồn nhiên của cô bé Totto-chan.', publisher: 'NXB Hội Nhà Văn', published_year: 2022, pages: 290 },
  { title: 'Chuyện Con Mèo Dạy Hải Âu Bay', slug: 'chuyen-con-meo-day-hai-au-bay', author: 'Luis Sepúlveda', price: 56_000, stock: 70, categories: ['thieu-nhi'], description: 'Lời hứa của chú mèo Zorba với chú hải âu — câu chuyện đẹp về tình yêu thương và lời hứa.', publisher: 'Nhã Nam', published_year: 2021, pages: 130 },
  { title: 'Không Gia Đình', slug: 'khong-gia-dinh', author: 'Hector Malot', price: 145_000, stock: 30, categories: ['thieu-nhi', 'van-hoc'], description: 'Hành trình lưu lạc đầy nghị lực của cậu bé Rémi đi tìm gia đình.', publisher: 'NXB Kim Đồng', published_year: 2020, pages: 450 },
  { title: 'Tuổi Thơ Dữ Dội', slug: 'tuoi-tho-du-doi', author: 'Phùng Quán', price: 160_000, stock: 40, categories: ['thieu-nhi', 'van-hoc'], description: 'Những thiếu niên trinh sát quả cảm trong kháng chiến chống Pháp ở Huế.', publisher: 'NXB Kim Đồng', published_year: 2021, pages: 600 },
  { title: 'Góc Sân Và Khoảng Trời', slug: 'goc-san-va-khoang-troi', author: 'Trần Đăng Khoa', price: 52_000, stock: 55, categories: ['thieu-nhi'], description: 'Tập thơ trong trẻo viết từ thuở "thần đồng thơ" của Trần Đăng Khoa.', publisher: 'NXB Kim Đồng', published_year: 2019, pages: 160 },

  // -- Kỹ năng sống --
  { title: 'Tôi Tài Giỏi, Bạn Cũng Thế', slug: 'toi-tai-gioi-ban-cung-the', author: 'Adam Khoo', price: 110_000, stock: 70, categories: ['ky-nang-song'], description: 'Phương pháp học tập và tư duy giúp học sinh phát huy tối đa tiềm năng.', publisher: 'First News', published_year: 2022, pages: 350 },
  { title: '7 Thói Quen Hiệu Quả', slug: '7-thoi-quen-hieu-qua', author: 'Stephen Covey', price: 138_000, stock: 50, categories: ['ky-nang-song'], description: 'Bảy thói quen nền tảng để sống chủ động, hiệu quả và cân bằng.', publisher: 'First News', published_year: 2021, pages: 430 },
  { title: 'Đời Ngắn Đừng Ngủ Dài', slug: 'doi-ngan-dung-ngu-dai', author: 'Robin Sharma', price: 75_000, stock: 60, categories: ['ky-nang-song'], description: 'Những bài học ngắn gọn truyền cảm hứng sống trọn vẹn từng ngày.', publisher: 'First News', published_year: 2020, pages: 220 },
  { title: 'Khéo Ăn Nói Sẽ Có Được Thiên Hạ', slug: 'kheo-an-noi-se-co-duoc-thien-ha', author: 'Trác Nhã', price: 99_000, stock: 55, categories: ['ky-nang-song'], description: 'Nghệ thuật giao tiếp ứng xử để thành công trong công việc và cuộc sống.', publisher: 'NXB Tổng Hợp', published_year: 2021, pages: 380 },
  { title: 'Đọc Vị Bất Kỳ Ai', slug: 'doc-vi-bat-ky-ai', author: 'David J. Lieberman', price: 79_000, stock: 50, categories: ['ky-nang-song', 'tam-ly'], description: 'Kỹ thuật phân tích tâm lý để hiểu suy nghĩ và ý định của người đối diện.', publisher: 'NXB Lao Động', published_year: 2020, pages: 250 },
  { title: 'Sức Mạnh Của Thói Quen', slug: 'suc-manh-cua-thoi-quen', author: 'Charles Duhigg', price: 129_000, stock: 40, categories: ['ky-nang-song'], description: 'Cơ chế hình thành thói quen và cách thay đổi chúng để cải thiện cuộc sống.', publisher: 'First News', published_year: 2022, pages: 400 },

  // -- Kinh tế --
  { title: 'Dạy Con Làm Giàu (Tập 1)', slug: 'day-con-lam-giau-tap-1', author: 'Robert Kiyosaki', price: 108_000, stock: 60, categories: ['kinh-te'], description: 'Tư duy về tiền bạc và tài sản qua hai người cha "giàu" và "nghèo".', publisher: 'NXB Trẻ', published_year: 2021, pages: 280 },
  { title: 'Người Giàu Có Nhất Thành Babylon', slug: 'nguoi-giau-co-nhat-thanh-babylon', author: 'George S. Clason', price: 72_000, stock: 65, categories: ['kinh-te'], description: 'Những bài học quản lý tài chính cá nhân qua các câu chuyện cổ thành Babylon.', publisher: 'First News', published_year: 2020, pages: 200 },
  { title: 'Nghĩ Giàu Làm Giàu', slug: 'nghi-giau-lam-giau', author: 'Napoleon Hill', price: 98_000, stock: 50, categories: ['kinh-te'], description: 'Triết lý thành công và làm giàu đúc kết từ hàng trăm doanh nhân.', publisher: 'First News', published_year: 2021, pages: 320 },
  { title: 'Khởi Nghiệp Tinh Gọn', slug: 'khoi-nghiep-tinh-gon', author: 'Eric Ries', price: 145_000, stock: 30, categories: ['kinh-te'], description: 'Phương pháp Lean Startup để xây dựng doanh nghiệp hiệu quả, ít rủi ro.', publisher: 'NXB Tổng Hợp', published_year: 2022, pages: 330 },
  { title: 'Tư Duy Nhanh Và Chậm', slug: 'tu-duy-nhanh-va-cham', author: 'Daniel Kahneman', price: 189_000, stock: 35, categories: ['kinh-te', 'tam-ly', 'khoa-hoc'], description: 'Hai hệ thống tư duy chi phối quyết định của con người — Nobel Kinh tế 2002.', publisher: 'Nhã Nam', published_year: 2021, pages: 600 },

  // -- Tâm lý --
  { title: 'Hiểu Về Trái Tim', slug: 'hieu-ve-trai-tim', author: 'Minh Niệm', price: 115_000, stock: 45, categories: ['tam-ly'], description: 'Những trang viết chữa lành về cảm xúc, khổ đau và bình an nội tâm.', publisher: 'NXB Tổng Hợp', published_year: 2022, pages: 420 },
  { title: 'Muôn Kiếp Nhân Sinh', slug: 'muon-kiep-nhan-sinh', author: 'Nguyên Phong', price: 156_000, stock: 50, categories: ['tam-ly'], description: 'Hành trình về luật nhân quả và sự tiến hóa của tâm thức con người.', publisher: 'First News', published_year: 2022, pages: 460 },
  { title: 'Dám Bị Ghét', slug: 'dam-bi-ghet', author: 'Kishimi Ichiro', price: 99_000, stock: 55, categories: ['tam-ly'], description: 'Đối thoại về tâm lý học Adler — can đảm sống là chính mình.', publisher: 'NXB Lao Động', published_year: 2021, pages: 300 },
  { title: 'Sức Mạnh Của Hiện Tại', slug: 'suc-manh-cua-hien-tai', author: 'Eckhart Tolle', price: 92_000, stock: 40, categories: ['tam-ly'], description: 'Hướng dẫn sống tỉnh thức và an trú trong khoảnh khắc hiện tại.', publisher: 'First News', published_year: 2020, pages: 260 },

  // -- Khoa học --
  { title: 'Lược Sử Thời Gian', slug: 'luoc-su-thoi-gian', author: 'Stephen Hawking', price: 128_000, stock: 40, categories: ['khoa-hoc'], description: 'Vũ trụ, hố đen và thời gian được giải thích dễ hiểu cho người đọc phổ thông.', publisher: 'NXB Trẻ', published_year: 2021, pages: 260 },
  { title: 'Vũ Trụ Trong Vỏ Hạt Dẻ', slug: 'vu-tru-trong-vo-hat-de', author: 'Stephen Hawking', price: 135_000, stock: 30, categories: ['khoa-hoc'], description: 'Những khám phá vật lý hiện đại về không-thời gian và lý thuyết dây.', publisher: 'NXB Trẻ', published_year: 2021, pages: 220 },
  { title: 'Gen Vị Kỷ', slug: 'gen-vi-ky', author: 'Richard Dawkins', price: 175_000, stock: 25, categories: ['khoa-hoc'], description: 'Góc nhìn tiến hóa lấy gen làm trung tâm — tác phẩm kinh điển của sinh học.', publisher: 'Nhã Nam', published_year: 2020, pages: 520 },

  // -- Lịch sử --
  { title: 'Việt Nam Sử Lược', slug: 'viet-nam-su-luoc', author: 'Trần Trọng Kim', price: 145_000, stock: 40, categories: ['lich-su'], description: 'Bộ thông sử Việt Nam súc tích, dễ đọc — công trình sử học nền tảng.', publisher: 'NXB Văn Học', published_year: 2020, pages: 600 },
  { title: 'Súng, Vi Trùng Và Thép', slug: 'sung-vi-trung-va-thep', author: 'Jared Diamond', price: 198_000, stock: 30, categories: ['lich-su', 'khoa-hoc'], description: 'Vì sao một số nền văn minh thống trị các nền văn minh khác — Pulitzer 1998.', publisher: 'Nhã Nam', published_year: 2021, pages: 550 },

  // -- Truyện tranh --
  { title: 'Doraemon (Tập 1)', slug: 'doraemon-tap-1', author: 'Fujiko F. Fujio', price: 18_000, stock: 100, categories: ['truyen-tranh', 'thieu-nhi'], description: 'Chú mèo máy Doraemon và những bảo bối thần kỳ giúp đỡ Nobita.', publisher: 'NXB Kim Đồng', published_year: 2022, pages: 192 },
  { title: 'Thám Tử Lừng Danh Conan (Tập 1)', slug: 'tham-tu-lung-danh-conan-tap-1', author: 'Aoyama Gosho', price: 20_000, stock: 90, categories: ['truyen-tranh'], description: 'Conan trong hình hài cậu bé phá giải những vụ án hóc búa.', publisher: 'NXB Kim Đồng', published_year: 2022, pages: 184 },
  { title: 'Thần Đồng Đất Việt (Tập 1)', slug: 'than-dong-dat-viet-tap-1', author: 'Lê Linh', price: 18_000, stock: 85, categories: ['truyen-tranh', 'thieu-nhi'], description: 'Trạng Tí thông minh cùng nhóm bạn trong bộ truyện tranh Việt nổi tiếng.', publisher: 'NXB Trẻ', published_year: 2021, pages: 160 },
  { title: 'One Piece (Tập 1)', slug: 'one-piece-tap-1', author: 'Eiichiro Oda', price: 20_000, stock: 80, categories: ['truyen-tranh'], description: 'Hành trình tìm kho báu One Piece của Luffy và băng hải tặc Mũ Rơm.', publisher: 'NXB Kim Đồng', published_year: 2022, pages: 200 },

  // ===== Sách kinh điển bổ sung (Phase 11 — +46 cuốn cho kho phong phú) =====
  // -- Văn học (VN & thế giới) --
  { title: 'Giông Tố', slug: 'giong-to', author: 'Vũ Trọng Phụng', price: 92_000, stock: 35, categories: ['van-hoc'], description: 'Tiểu thuyết phơi bày xã hội thực dân nửa phong kiến qua bi kịch của Thị Mịch và Nghị Hách.', publisher: 'NXB Văn Học', published_year: 2019, pages: 380 },
  { title: 'Vang Bóng Một Thời', slug: 'vang-bong-mot-thoi', author: 'Nguyễn Tuân', price: 78_000, stock: 30, categories: ['van-hoc'], description: 'Tập truyện về nét đẹp tài hoa của lớp nho sĩ xưa — văn chương Nguyễn Tuân uyên bác, tài hoa.', publisher: 'NXB Hội Nhà Văn', published_year: 2020, pages: 240 },
  { title: 'Gió Lạnh Đầu Mùa', slug: 'gio-lanh-dau-mua', author: 'Thạch Lam', price: 65_000, stock: 40, categories: ['van-hoc'], description: 'Tuyển tập truyện ngắn trữ tình, nhẹ nhàng mà sâu lắng về những phận người bình dị.', publisher: 'NXB Văn Học', published_year: 2021, pages: 200 },
  { title: 'Bỉ Vỏ', slug: 'bi-vo', author: 'Nguyên Hồng', price: 70_000, stock: 30, categories: ['van-hoc'], description: 'Số phận bi thảm của Tám Bính giữa thế giới lưu manh nơi đất Cảng trước Cách mạng.', publisher: 'NXB Văn Học', published_year: 2019, pages: 220 },
  { title: 'Chiến Tranh Và Hòa Bình', slug: 'chien-tranh-va-hoa-binh', author: 'Lev Tolstoy', price: 385_000, stock: 18, categories: ['van-hoc'], description: 'Sử thi đồ sộ về nước Nga thời chiến tranh chống Napoleon — đỉnh cao văn học thế giới.', publisher: 'NXB Văn Học', published_year: 2020, pages: 1700 },
  { title: 'Tội Ác Và Hình Phạt', slug: 'toi-ac-va-hinh-phat', author: 'Fyodor Dostoevsky', price: 175_000, stock: 25, categories: ['van-hoc', 'tam-ly'], description: 'Cuộc giằng xé nội tâm của chàng sinh viên Raskolnikov sau khi gây án — kiệt tác tâm lý.', publisher: 'Nhã Nam', published_year: 2021, pages: 680 },
  { title: 'Bố Già', slug: 'bo-gia', author: 'Mario Puzo', price: 155_000, stock: 35, categories: ['van-hoc'], description: 'Thế giới ngầm của gia đình mafia Corleone — tiểu thuyết về quyền lực, gia đình và danh dự.', publisher: 'NXB Văn Học', published_year: 2022, pages: 600 },
  { title: 'Cuốn Theo Chiều Gió', slug: 'cuon-theo-chieu-gio', author: 'Margaret Mitchell', price: 245_000, stock: 22, categories: ['van-hoc'], description: 'Tình yêu và sinh tồn của nàng Scarlett giữa cuộc Nội chiến Mỹ — giải Pulitzer 1937.', publisher: 'NXB Văn Học', published_year: 2021, pages: 1100 },
  { title: 'Kiêu Hãnh Và Định Kiến', slug: 'kieu-hanh-va-dinh-kien', author: 'Jane Austen', price: 110_000, stock: 35, categories: ['van-hoc'], description: 'Chuyện tình duyên trắc trở giữa Elizabeth và quý ông Darcy trong xã hội Anh thế kỷ 19.', publisher: 'Nhã Nam', published_year: 2020, pages: 420 },
  { title: 'Giết Con Chim Nhại', slug: 'giet-con-chim-nhai', author: 'Harper Lee', price: 125_000, stock: 30, categories: ['van-hoc'], description: 'Công lý và định kiến chủng tộc qua đôi mắt trẻ thơ ở miền Nam nước Mỹ — Pulitzer 1961.', publisher: 'Nhã Nam', published_year: 2022, pages: 380 },
  { title: '1984', slug: '1984', author: 'George Orwell', price: 108_000, stock: 40, categories: ['van-hoc'], description: 'Xã hội toàn trị bị giám sát tuyệt đối dưới con mắt Anh Cả — tiểu thuyết phản địa đàng kinh điển.', publisher: 'Nhã Nam', published_year: 2021, pages: 400 },
  { title: 'Nhà Thờ Đức Bà Paris', slug: 'nha-tho-duc-ba-paris', author: 'Victor Hugo', price: 165_000, stock: 25, categories: ['van-hoc'], description: 'Bi kịch của chàng gù Quasimodo và nàng Esmeralda dưới bóng nhà thờ Đức Bà.', publisher: 'NXB Văn Học', published_year: 2020, pages: 520 },
  { title: 'Tiếng Gọi Nơi Hoang Dã', slug: 'tieng-goi-noi-hoang-da', author: 'Jack London', price: 72_000, stock: 40, categories: ['van-hoc'], description: 'Hành trình trở về bản năng hoang dã của chú chó Buck nơi vùng băng giá Alaska.', publisher: 'Nhã Nam', published_year: 2021, pages: 180 },
  { title: 'Bắt Trẻ Đồng Xanh', slug: 'bat-tre-dong-xanh', author: 'J.D. Salinger', price: 95_000, stock: 35, categories: ['van-hoc'], description: 'Mấy ngày lang thang của cậu thiếu niên Holden — tiếng nói nổi loạn của tuổi mới lớn.', publisher: 'Nhã Nam', published_year: 2020, pages: 260 },

  // -- Thiếu nhi --
  { title: 'Pippi Tất Dài', slug: 'pippi-tat-dai', author: 'Astrid Lindgren', price: 78_000, stock: 50, categories: ['thieu-nhi'], description: 'Cô bé Pippi khỏe nhất thế giới và những trò nghịch ngợm khiến trẻ em mê mẩn.', publisher: 'NXB Kim Đồng', published_year: 2021, pages: 200 },
  { title: 'Những Tấm Lòng Cao Cả', slug: 'nhung-tam-long-cao-ca', author: 'Edmondo De Amicis', price: 88_000, stock: 40, categories: ['thieu-nhi', 'van-hoc'], description: 'Nhật ký cậu học trò Enrico — những bài học cảm động về lòng nhân ái và tình thầy trò.', publisher: 'NXB Kim Đồng', published_year: 2020, pages: 320 },
  { title: 'Alice Ở Xứ Sở Thần Tiên', slug: 'alice-o-xu-so-than-tien', author: 'Lewis Carroll', price: 75_000, stock: 50, categories: ['thieu-nhi'], description: 'Cuộc phiêu lưu kỳ ảo của Alice qua xứ sở diệu kỳ đầy nhân vật lạ lùng.', publisher: 'Nhã Nam', published_year: 2022, pages: 180 },
  { title: 'Truyện Cổ Andersen', slug: 'truyen-co-andersen', author: 'Hans Christian Andersen', price: 135_000, stock: 45, categories: ['thieu-nhi'], description: 'Tuyển tập cổ tích bất hủ: Cô Bé Bán Diêm, Nàng Tiên Cá, Vịt Con Xấu Xí...', publisher: 'NXB Kim Đồng', published_year: 2021, pages: 480 },
  { title: 'Charlie Và Nhà Máy Sô Cô La', slug: 'charlie-va-nha-may-so-co-la', author: 'Roald Dahl', price: 82_000, stock: 50, categories: ['thieu-nhi'], description: 'Cậu bé Charlie và tấm vé vàng vào nhà máy sô cô la kỳ diệu của ông Wonka.', publisher: 'Nhã Nam', published_year: 2022, pages: 220 },
  { title: 'Vừa Nhắm Mắt Vừa Mở Cửa Sổ', slug: 'vua-nham-mat-vua-mo-cua-so', author: 'Nguyễn Ngọc Thuần', price: 68_000, stock: 45, categories: ['thieu-nhi', 'van-hoc'], description: 'Thế giới trong trẻo của cậu bé miền quê tập cảm nhận cuộc sống bằng mọi giác quan.', publisher: 'NXB Trẻ', published_year: 2021, pages: 180 },
  { title: 'Harry Potter Và Hòn Đá Phù Thủy', slug: 'harry-potter-va-hon-da-phu-thuy', author: 'J.K. Rowling', price: 145_000, stock: 60, categories: ['thieu-nhi', 'van-hoc'], description: 'Cậu bé Harry khám phá thân phận phù thủy và bước vào trường Hogwarts kỳ diệu.', publisher: 'NXB Trẻ', published_year: 2022, pages: 380 },

  // -- Kỹ năng sống --
  { title: 'Cà Phê Cùng Tony', slug: 'ca-phe-cung-tony', author: 'Tony Buổi Sáng', price: 90_000, stock: 55, categories: ['ky-nang-song'], description: 'Những bài viết dí dỏm mà sâu cay về tư duy và thái độ sống cho người trẻ.', publisher: 'NXB Trẻ', published_year: 2022, pages: 290 },
  { title: 'Người Bán Hàng Vĩ Đại Nhất Thế Giới', slug: 'nguoi-ban-hang-vi-dai-nhat-the-gioi', author: 'Og Mandino', price: 72_000, stock: 45, categories: ['ky-nang-song'], description: 'Mười cuộn da bí mật chứa đựng triết lý thành công trong nghề bán hàng và cuộc sống.', publisher: 'First News', published_year: 2020, pages: 180 },
  { title: 'Không Bao Giờ Là Thất Bại - Tất Cả Là Thử Thách', slug: 'khong-bao-gio-la-that-bai', author: 'Chung Ju Yung', price: 98_000, stock: 40, categories: ['ky-nang-song'], description: 'Tự truyện của nhà sáng lập Hyundai — tinh thần dám nghĩ dám làm vượt mọi nghịch cảnh.', publisher: 'First News', published_year: 2021, pages: 320 },
  { title: 'Thói Quen Nguyên Tử', slug: 'thoi-quen-nguyen-tu', author: 'James Clear', price: 152_000, stock: 50, categories: ['ky-nang-song'], description: 'Cách xây dựng thói quen tốt và xóa bỏ thói quen xấu bằng những thay đổi nhỏ mỗi ngày.', publisher: 'NXB Thế Giới', published_year: 2022, pages: 320 },
  { title: 'Nghệ Thuật Tinh Tế Của Việc Đếch Quan Tâm', slug: 'nghe-thuat-tinh-te-cua-viec-dech-quan-tam', author: 'Mark Manson', price: 109_000, stock: 45, categories: ['ky-nang-song', 'tam-ly'], description: 'Học cách chọn lọc điều đáng quan tâm để sống nhẹ nhõm và ý nghĩa hơn.', publisher: 'NXB Văn Học', published_year: 2021, pages: 260 },

  // -- Kinh tế --
  { title: 'Nhà Đầu Tư Thông Minh', slug: 'nha-dau-tu-thong-minh', author: 'Benjamin Graham', price: 215_000, stock: 30, categories: ['kinh-te'], description: 'Kinh thánh của đầu tư giá trị — nền tảng tư duy của Warren Buffett.', publisher: 'NXB Tổng Hợp', published_year: 2021, pages: 640 },
  { title: 'Từ Tốt Đến Vĩ Đại', slug: 'tu-tot-den-vi-dai', author: 'Jim Collins', price: 145_000, stock: 35, categories: ['kinh-te'], description: 'Vì sao một số công ty bứt phá thành vĩ đại còn số khác thì không.', publisher: 'NXB Trẻ', published_year: 2020, pages: 400 },
  { title: 'Gã Nghiện Giày', slug: 'ga-nghien-giay', author: 'Phil Knight', price: 168_000, stock: 35, categories: ['kinh-te'], description: 'Hồi ký nhà sáng lập Nike — hành trình khởi nghiệp đầy mạo hiểm và đam mê.', publisher: 'NXB Lao Động', published_year: 2022, pages: 450 },
  { title: 'Những Kẻ Xuất Chúng', slug: 'nhung-ke-xuat-chung', author: 'Malcolm Gladwell', price: 128_000, stock: 35, categories: ['kinh-te', 'tam-ly'], description: 'Điều gì thật sự làm nên người thành công — không chỉ tài năng mà cả hoàn cảnh và may mắn.', publisher: 'Nhã Nam', published_year: 2021, pages: 350 },
  { title: 'Phi Lý Trí', slug: 'phi-ly-tri', author: 'Dan Ariely', price: 119_000, stock: 35, categories: ['kinh-te', 'tam-ly'], description: 'Những sai lầm phi lý có hệ thống chi phối quyết định mua sắm và lựa chọn của con người.', publisher: 'NXB Lao Động', published_year: 2020, pages: 380 },

  // -- Tâm lý --
  { title: 'Đi Tìm Lẽ Sống', slug: 'di-tim-le-song', author: 'Viktor Frankl', price: 78_000, stock: 45, categories: ['tam-ly'], description: 'Bác sĩ tâm thần sống sót qua trại tập trung và bài học sâu sắc về ý nghĩa cuộc đời.', publisher: 'NXB Tổng Hợp', published_year: 2021, pages: 220 },
  { title: 'Trí Tuệ Xúc Cảm', slug: 'tri-tue-xuc-cam', author: 'Daniel Goleman', price: 139_000, stock: 35, categories: ['tam-ly'], description: 'Vì sao EQ quan trọng hơn IQ trong thành công và hạnh phúc của con người.', publisher: 'NXB Lao Động', published_year: 2020, pages: 460 },
  { title: 'An Lạc Từng Bước Chân', slug: 'an-lac-tung-buoc-chan', author: 'Thích Nhất Hạnh', price: 72_000, stock: 50, categories: ['tam-ly'], description: 'Thực tập chánh niệm trong đời sống hằng ngày để tìm bình an ngay bây giờ.', publisher: 'NXB Hội Nhà Văn', published_year: 2022, pages: 200 },
  { title: 'Bước Chậm Lại Giữa Thế Gian Vội Vã', slug: 'buoc-cham-lai-giua-the-gian-voi-va', author: 'Hae Min', price: 95_000, stock: 45, categories: ['tam-ly'], description: 'Những lời nhắn nhủ nhẹ nhàng giúp tâm hồn lắng lại giữa cuộc sống hối hả.', publisher: 'NXB Hội Nhà Văn', published_year: 2021, pages: 280 },
  { title: 'Khi Hơi Thở Hóa Thinh Không', slug: 'khi-hoi-tho-hoa-thinh-khong', author: 'Paul Kalanithi', price: 88_000, stock: 40, categories: ['tam-ly', 'van-hoc'], description: 'Hồi ký xúc động của bác sĩ trẻ đối diện cái chết — đi tìm ý nghĩa của sự sống.', publisher: 'NXB Lao Động', published_year: 2022, pages: 240 },

  // -- Khoa học --
  { title: 'Vũ Trụ', slug: 'vu-tru-cosmos', author: 'Carl Sagan', price: 198_000, stock: 25, categories: ['khoa-hoc'], description: 'Hành trình kỳ vĩ khám phá vũ trụ và vị trí của con người trong dải ngân hà.', publisher: 'Nhã Nam', published_year: 2021, pages: 500 },
  { title: 'Nguồn Gốc Các Loài', slug: 'nguon-goc-cac-loai', author: 'Charles Darwin', price: 185_000, stock: 22, categories: ['khoa-hoc'], description: 'Học thuyết tiến hóa bằng chọn lọc tự nhiên — công trình thay đổi sinh học mãi mãi.', publisher: 'NXB Tri Thức', published_year: 2020, pages: 560 },
  { title: '7 Bài Học Hay Nhất Về Vật Lý', slug: '7-bai-hoc-hay-nhat-ve-vat-ly', author: 'Carlo Rovelli', price: 65_000, stock: 35, categories: ['khoa-hoc'], description: 'Bảy bài viết ngắn gọn, thi vị giới thiệu những ý tưởng lớn của vật lý hiện đại.', publisher: 'Nhã Nam', published_year: 2021, pages: 110 },
  { title: 'Lược Sử Vạn Vật', slug: 'luoc-su-van-vat', author: 'Bill Bryson', price: 215_000, stock: 25, categories: ['khoa-hoc'], description: 'Câu chuyện hấp dẫn về khoa học — từ vụ nổ Big Bang đến sự sống trên Trái Đất.', publisher: 'Nhã Nam', published_year: 2022, pages: 600 },

  // -- Lịch sử & cổ điển Trung Hoa --
  { title: 'Tam Quốc Diễn Nghĩa', slug: 'tam-quoc-dien-nghia', author: 'La Quán Trung', price: 320_000, stock: 25, categories: ['van-hoc', 'lich-su'], description: 'Bộ tiểu thuyết lịch sử về thời Tam Quốc với Lưu Bị, Tào Tháo, Khổng Minh.', publisher: 'NXB Văn Học', published_year: 2020, pages: 1500 },
  { title: 'Tây Du Ký', slug: 'tay-du-ky', author: 'Ngô Thừa Ân', price: 285_000, stock: 30, categories: ['van-hoc', 'thieu-nhi'], description: 'Bốn thầy trò Đường Tăng vượt 81 kiếp nạn thỉnh kinh — kiệt tác cổ điển Trung Hoa.', publisher: 'NXB Văn Học', published_year: 2021, pages: 1400 },
  { title: 'Sử Ký Tư Mã Thiên', slug: 'su-ky-tu-ma-thien', author: 'Tư Mã Thiên', price: 175_000, stock: 22, categories: ['lich-su'], description: 'Bộ sử vĩ đại ghi chép hơn hai nghìn năm lịch sử Trung Hoa cổ đại.', publisher: 'NXB Văn Học', published_year: 2020, pages: 700 },

  // -- Truyện tranh --
  { title: 'Naruto (Tập 1)', slug: 'naruto-tap-1', author: 'Masashi Kishimoto', price: 20_000, stock: 80, categories: ['truyen-tranh'], description: 'Cậu nhẫn giả Naruto trên hành trình trở thành Hokage của làng Lá.', publisher: 'NXB Kim Đồng', published_year: 2022, pages: 192 },
  { title: 'Dragon Ball (Tập 1)', slug: 'dragon-ball-tap-1', author: 'Akira Toriyama', price: 18_000, stock: 85, categories: ['truyen-tranh', 'thieu-nhi'], description: 'Songoku đi tìm bảy viên ngọc rồng — bộ truyện huyền thoại của tuổi thơ.', publisher: 'NXB Kim Đồng', published_year: 2022, pages: 192 },
  { title: 'Shin - Cậu Bé Bút Chì (Tập 1)', slug: 'shin-cau-be-but-chi-tap-1', author: 'Yoshito Usui', price: 20_000, stock: 80, categories: ['truyen-tranh', 'thieu-nhi'], description: 'Những tình huống lầy lội đáng yêu của cậu nhóc Shin năm tuổi.', publisher: 'NXB Kim Đồng', published_year: 2021, pages: 160 },
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
        publisher: b.publisher, // undefined cho sách cũ chưa có → Prisma bỏ qua (cột optional)
        published_year: b.published_year,
        pages: b.pages,
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
  console.log(`✔ Khách demo: ${DEMO_CUSTOMERS.length} tài khoản (mật khẩu cấu hình trong seed.ts)`);

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

  // Dữ liệu demo (khách mẫu mật khẩu chung + đơn + review) CHỈ seed khi BẬT RÕ RÀNG
  // SEED_DEMO_DATA=true VÀ KHÔNG ở production — tránh tạo tài khoản khách dùng chung mật khẩu
  // trên môi trường công khai (ai cũng đăng nhập được khach1/khach2 với Demo@123).
  if (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA === 'true') {
    await seedDemoData();
  } else {
    console.log('⏭ Bỏ qua dữ liệu demo (chỉ seed khi SEED_DEMO_DATA=true và không phải production)');
  }
}

main()
  .then(() => console.log('🌱 Seed hoàn tất'))
  .catch((e) => {
    console.error('Seed thất bại:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
