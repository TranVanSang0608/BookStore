// Unit test cho chatbot — mock DeepSeek (không gọi API thật) + mock listBooks (không chạm DB).
// Mục tiêu: kiểm LUỒNG tool loop + grounding + fallback + xử lý lỗi, không tốn tiền API.
import { createChatCompletion } from '../lib/deepseek';
import { listBooks } from '../modules/catalog/book.service';
import { chat } from '../modules/chat/service';
import { runSearchBooks, simplifyKeyword } from '../modules/chat/tools';

jest.mock('../lib/deepseek', () => ({
  DEEPSEEK_MODEL: 'test-model',
  createChatCompletion: jest.fn(),
}));

jest.mock('../modules/catalog/book.service', () => ({
  listBooks: jest.fn(),
}));

const mockCreate = createChatCompletion as jest.Mock;
const mockListBooks = listBooks as jest.Mock;

// 1 item giống hệt shape listBooks trả về (bookCardSelect)
function bookItem(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'Đắc Nhân Tâm',
    slug: 'dac-nhan-tam',
    price: 86_000,
    stock_quantity: 100,
    cover_image_url: 'http://img/dac-nhan-tam.jpg',
    avg_rating: 4.5,
    review_count: 10,
    author: { id: 1, name: 'Dale Carnegie' },
    ...over,
  };
}

const listResult = (items: unknown[]) => ({ items, total: items.length, page: 1, limit: 5, totalPages: 1 });

// Giả response DeepSeek: 1 assistant message trả thẳng chữ (không gọi tool)
const replyMsg = (content: string) => ({ choices: [{ message: { content } }] });
// Giả response DeepSeek: assistant đòi gọi tool search_books với arguments cho trước
const toolCallMsg = (args: unknown) => ({
  choices: [
    {
      message: {
        content: null,
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'search_books', arguments: JSON.stringify(args) } },
        ],
      },
    },
  ],
});

beforeEach(() => jest.clearAllMocks());

describe('chat() — FAQ không cần tool', () => {
  it('model trả lời thẳng → không gọi listBooks, books rỗng', async () => {
    mockCreate.mockResolvedValueOnce(replyMsg('Phí ship 35.000đ, miễn phí từ 300.000đ.'));

    const res = await chat([{ role: 'user', content: 'ship bao nhiêu?' }]);

    expect(res.reply).toContain('ship');
    expect(res.books).toEqual([]);
    expect(mockListBooks).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(1); // chỉ 1 vòng, không có lần 2
  });
});

describe('chat() — gọi tool search_books (grounding)', () => {
  it('chạy tool đúng tham số rồi gọi DeepSeek lần 2, trả books map từ DB thật', async () => {
    mockCreate
      .mockResolvedValueOnce(toolCallMsg({ query: 'kỹ năng', price_max: 100_000 }))
      .mockResolvedValueOnce(replyMsg('Mình gợi ý vài cuốn nhé'));
    mockListBooks.mockResolvedValue(listResult([bookItem()]));

    const res = await chat([{ role: 'user', content: 'gợi ý sách kỹ năng dưới 100k' }]);

    expect(mockCreate).toHaveBeenCalledTimes(2); // tool loop 1 vòng = 2 lần gọi model
    expect(mockListBooks).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'kỹ năng', price_max: 100_000, page: 1, limit: 5, sort: 'newest' }),
    );
    expect(res.reply).toBe('Mình gợi ý vài cuốn nhé');
    expect(res.books).toHaveLength(1);
    // map đúng: stock_quantity→stock, author.name→author, KHÔNG có salePrice/category
    expect(res.books[0]).toMatchObject({
      title: 'Đắc Nhân Tâm',
      author: 'Dale Carnegie',
      price: 86_000,
      stock: 100,
      slug: 'dac-nhan-tam',
      rating: 4.5,
    });
    expect(res.books[0]).not.toHaveProperty('salePrice');
  });
});

describe('chat() — DeepSeek lỗi', () => {
  it('ném AppError 503 (không để trắng màn hình)', async () => {
    mockCreate.mockRejectedValueOnce(new Error('model not found'));

    await expect(chat([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ statusCode: 503 });
  });
});

describe('chat() — các nhánh phụ của tool loop', () => {
  it('model gọi kèm 1 công cụ lạ → vẫn trả ĐÚNG 1 message cho MỖI tool_call (khớp id)', async () => {
    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                { id: 'a', type: 'function', function: { name: 'search_books', arguments: '{"query":"kỹ năng"}' } },
                { id: 'b', type: 'function', function: { name: 'unknown_fn', arguments: '{}' } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce(replyMsg('ok'));
    mockListBooks.mockResolvedValue(listResult([bookItem()]));

    const res = await chat([{ role: 'user', content: 'x' }]);

    expect(res.reply).toBe('ok');
    const secondMessages = mockCreate.mock.calls[1][0].messages;
    const toolIds = secondMessages.filter((m: { role: string }) => m.role === 'tool').map((m: { tool_call_id: string }) => m.tool_call_id);
    expect(toolIds.sort()).toEqual(['a', 'b']); // mỗi tool_call có đúng 1 phản hồi
  });

  it('câu trả lời lần 2 rỗng → dùng FALLBACK_REPLY', async () => {
    mockCreate
      .mockResolvedValueOnce(toolCallMsg({ query: 'kỹ năng' }))
      .mockResolvedValueOnce({ choices: [{ message: { content: '' } }] });
    mockListBooks.mockResolvedValue(listResult([bookItem()]));

    const res = await chat([{ role: 'user', content: 'x' }]);

    expect(res.reply).toContain('chưa rõ ý');
  });
});

describe('runSearchBooks() — fallback + matched', () => {
  it('tìm ra ngay → matched=true', async () => {
    mockListBooks.mockResolvedValueOnce(listResult([bookItem()]));

    const r = await runSearchBooks({ query: 'đắc nhân tâm' });

    expect(r.matched).toBe(true);
    expect(r.books).toHaveLength(1);
    expect(mockListBooks).toHaveBeenCalledTimes(1);
  });

  it('rỗng lần đầu → fallback bằng từ khoá rút gọn → matched=false', async () => {
    mockListBooks
      .mockResolvedValueOnce(listResult([])) // lần đầu: không thấy
      .mockResolvedValueOnce(listResult([bookItem()])); // fallback: thấy

    const r = await runSearchBooks({ query: 'sách trinh thám ly kỳ', price_max: 100_000 });

    expect(r.matched).toBe(false);
    expect(r.books).toHaveLength(1);
    expect(mockListBooks).toHaveBeenCalledTimes(2);
    // fallback chỉ giữ giá tối đa + từ khoá rút gọn (bỏ stopword 'sách')
    expect(mockListBooks.mock.calls[1][0]).toMatchObject({ q: 'trinh thám', price_max: 100_000 });
  });

  it('rỗng cả 2 lần → books rỗng, matched=false (để bot nói "không tìm thấy")', async () => {
    mockListBooks.mockResolvedValue(listResult([]));

    const r = await runSearchBooks({ query: 'sachkhongtontai' });

    expect(r.books).toEqual([]);
    expect(r.matched).toBe(false);
  });

  it('in_stock_only → đẩy lọc còn-hàng XUỐNG listBooks (in_stock:true), không lọc sau limit', async () => {
    mockListBooks.mockResolvedValueOnce(listResult([bookItem()]));

    await runSearchBooks({ query: 'kỹ năng', in_stock_only: true });

    expect(mockListBooks).toHaveBeenCalledWith(expect.objectContaining({ in_stock: true }));
  });

  it('mapSort: giữ price_desc, quy relevance về newest', async () => {
    mockListBooks.mockResolvedValueOnce(listResult([bookItem()]));
    await runSearchBooks({ query: 'x', sort: 'price_desc' });
    expect(mockListBooks.mock.calls.at(-1)![0]).toMatchObject({ sort: 'price_desc' });

    mockListBooks.mockResolvedValueOnce(listResult([bookItem()]));
    await runSearchBooks({ query: 'x', sort: 'relevance' });
    expect(mockListBooks.mock.calls.at(-1)![0]).toMatchObject({ sort: 'newest' });
  });

  it('query toàn stopword → simplifyKeyword="" → KHÔNG chạy fallback (chỉ 1 lần gọi DB)', async () => {
    mockListBooks.mockResolvedValue(listResult([]));

    const r = await runSearchBooks({ query: 'mình muốn sách' });

    expect(r.books).toEqual([]);
    expect(mockListBooks).toHaveBeenCalledTimes(1);
  });
});

describe('simplifyKeyword()', () => {
  it('bỏ stopword, lấy tối đa 2 từ khoá chính', () => {
    expect(simplifyKeyword('mình muốn sách kỹ năng')).toBe('kỹ năng');
    expect(simplifyKeyword('sách trinh thám dưới 100k')).toBe('trinh thám');
  });
});
