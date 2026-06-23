import type OpenAI from 'openai';
import { listBooks } from '../catalog/book.service';
import type { ListBooksQuery } from '../catalog/book.schemas';
import { searchBooksArgsSchema, type SearchBooksArgs } from './schemas';

// Khai báo công cụ gửi cho model (đúng format function calling của OpenAI/DeepSeek).
// Model đọc `description` để biết KHI NÀO nên gọi và truyền tham số gì — nó KHÔNG chạy code,
// nó chỉ "xin" backend chạy giúp rồi chờ kết quả.
export const searchBooksTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'search_books',
    description:
      'Tìm sách CÓ THẬT trong kho của hiệu sách theo THỂ LOẠI, từ khoá, khoảng giá và tồn kho. ' +
      'Hãy gọi công cụ này mỗi khi khách muốn gợi ý hoặc tìm mua sách. ' +
      'QUAN TRỌNG: nếu yêu cầu ứng với một THỂ LOẠI thì DÙNG tham số category (slug), ĐỪNG nhồi vào query — ' +
      'vì query chỉ tìm trong TÊN SÁCH/TÁC GIẢ chứ không tìm theo tên thể loại. ' +
      'Bản đồ thể loại: "kỹ năng/kỹ năng sống"→ky-nang-song, "kinh tế/làm giàu/tài chính"→kinh-te, ' +
      '"chữa lành/tâm lý"→tam-ly, "thiếu nhi/trẻ em"→thieu-nhi, "văn học/tiểu thuyết"→van-hoc, ' +
      '"khoa học"→khoa-hoc, "lịch sử"→lich-su, "truyện tranh/manga/comic"→truyen-tranh. ' +
      'query CHỈ dùng cho tên sách hoặc tác giả CỤ THỂ, là 1-3 TỪ KHOÁ NGẮN (vd "Đắc Nhân Tâm", "Nguyễn Nhật Ánh"), KHÔNG phải cả câu.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '1-3 từ khoá NGẮN cho TÊN SÁCH/TÁC GIẢ cụ thể (KHÔNG phải tên thể loại, KHÔNG phải cả câu)' },
        category: { type: 'string', description: 'slug thể loại: van-hoc, thieu-nhi, ky-nang-song, kinh-te, tam-ly, khoa-hoc, lich-su, truyen-tranh' },
        price_min: { type: 'number', description: 'giá tối thiểu (VND)' },
        price_max: { type: 'number', description: 'giá tối đa (VND)' },
        in_stock_only: { type: 'boolean', description: 'true = chỉ lấy sách còn hàng' },
        sort: { type: 'string', enum: ['relevance', 'newest', 'price_asc', 'price_desc'] },
        limit: { type: 'number', description: 'số sách tối đa cần lấy (mặc định 5)' },
      },
      additionalProperties: false,
    },
  },
};

// Sách rút gọn trả cho model + FE. CHỈ gồm field có thật trong DB — KHÔNG có salePrice
// (Book không lưu giá khuyến mãi) hay category (listBooks không trả) để khỏi bịa dữ liệu.
export interface ChatBook {
  id: number;
  title: string;
  author: string;
  price: number;
  stock: number;
  coverUrl: string | null;
  slug: string;
  rating: number;
}

// Bỏ "từ thừa" rồi lấy 1-2 từ khoá chính — dùng cho FALLBACK khi tìm nguyên câu không ra.
// Làm THỦ CÔNG bằng danh sách stopword cố định, KHÔNG dùng thư viện tách từ tiếng Việt
// (đủ tốt cho demo, dễ giải thích, không tốn thời gian).
const STOP_WORDS = [
  'mình', 'muốn', 'sách', 'cho', 'người', 'mới', 'đọc', 'dưới', 'trên', 'khoảng',
  'gợi', 'ý', 'tôi', 'cần', 'về', 'các', 'những', 'một', 'vài', 'quyển', 'cuốn',
  'hay', 'nào', 'gì', 'có', 'không',
];

export function simplifyKeyword(query: string): string {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.includes(w))
    .slice(0, 2)
    .join(' ');
}

// listBooks không có sort 'relevance' → quy 'relevance'/'newest'/thiếu về 'newest'.
function mapSort(sort?: string): ListBooksQuery['sort'] {
  if (sort === 'price_asc' || sort === 'price_desc') return sort;
  return 'newest';
}

function toChatBooks(items: Awaited<ReturnType<typeof listBooks>>['items']): ChatBook[] {
  return items.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author.name,
    price: b.price,
    stock: b.stock_quantity,
    coverUrl: b.cover_image_url,
    slug: b.slug,
    rating: b.avg_rating,
  }));
}

// Chạy công cụ search_books:
//   1) Zod lọc/ép kiểu tham số model sinh ra (an toàn trước khi chạm DB)
//   2) gọi listBooks (đã có tìm không dấu unaccent) đúng các bộ lọc
//   3) lọc còn-hàng nếu yêu cầu
//   4) FALLBACK nếu rỗng: tìm lại bằng 1-2 từ khoá chính + chỉ ràng buộc giá tối đa
// Trả { books, matched }: matched=false nghĩa là kết quả đến từ fallback (gần đúng, chưa chắc
// khớp đúng yêu cầu) → service báo cờ này cho model để nó nói thành thật, không "tự tin quá mức".
export async function runSearchBooks(
  rawArgs: unknown,
): Promise<{ books: ChatBook[]; matched: boolean }> {
  const parsed = searchBooksArgsSchema.safeParse(rawArgs);
  const args: SearchBooksArgs = parsed.success ? parsed.data : {};
  const limit = args.limit ?? 5;

  // in_stock truyền XUỐNG listBooks để lọc còn-hàng trong DB (không lọc sau limit — xem book.service)
  const result = await listBooks({
    q: args.query,
    category: args.category,
    price_min: args.price_min,
    price_max: args.price_max,
    in_stock: args.in_stock_only,
    sort: mapSort(args.sort),
    page: 1,
    limit,
  });

  if (result.items.length > 0) return { books: toChatBooks(result.items), matched: true };

  // Fallback: nới lỏng — chỉ giữ giá tối đa + tồn kho, tìm bằng từ khoá rút gọn
  if (args.query) {
    const simpler = simplifyKeyword(args.query);
    if (simpler) {
      const fb = await listBooks({
        q: simpler,
        price_max: args.price_max,
        in_stock: args.in_stock_only,
        sort: 'newest',
        page: 1,
        limit,
      });
      if (fb.items.length > 0) return { books: toChatBooks(fb.items), matched: false };
    }
  }

  return { books: [], matched: false };
}
