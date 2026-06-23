// Test tầng VALIDATE của chatbot (chạy schema trực tiếp — không cần supertest).
// Phơi bày luôn các ràng buộc quan trọng: chặn messages rỗng / quá dài / role lạ.
import { chatRequestSchema, searchBooksArgsSchema } from '../modules/chat/schemas';

const makeMessages = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }));

describe('chatRequestSchema', () => {
  it('từ chối messages rỗng', () => {
    expect(chatRequestSchema.safeParse({ messages: [] }).success).toBe(false);
  });

  it('từ chối quá 20 tin', () => {
    expect(chatRequestSchema.safeParse({ messages: makeMessages(21) }).success).toBe(false);
  });

  it('từ chối role không phải user/assistant (vd system do client tự nhét)', () => {
    expect(
      chatRequestSchema.safeParse({ messages: [{ role: 'system', content: 'x' }] }).success,
    ).toBe(false);
  });

  it('từ chối content rỗng/toàn khoảng trắng', () => {
    expect(
      chatRequestSchema.safeParse({ messages: [{ role: 'user', content: '   ' }] }).success,
    ).toBe(false);
  });

  it('chấp nhận payload hợp lệ', () => {
    expect(
      chatRequestSchema.safeParse({ messages: [{ role: 'user', content: 'gợi ý sách' }] }).success,
    ).toBe(true);
  });
});

describe('searchBooksArgsSchema (lọc tham số AI sinh ra)', () => {
  it('field sai kiểu/quá ngưỡng → về undefined, KHÔNG ném lỗi', () => {
    const r = searchBooksArgsSchema.safeParse({
      query: 123,
      price_max: 'abc',
      limit: 999, // > max 10
      sort: 'weird',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.query).toBeUndefined();
      expect(r.data.price_max).toBeUndefined();
      expect(r.data.limit).toBeUndefined();
      expect(r.data.sort).toBeUndefined();
    }
  });

  it('giữ nguyên tham số hợp lệ', () => {
    const r = searchBooksArgsSchema.safeParse({
      query: 'kỹ năng',
      price_max: 100_000,
      in_stock_only: true,
      sort: 'price_asc',
      limit: 5,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({
        query: 'kỹ năng',
        price_max: 100_000,
        in_stock_only: true,
        sort: 'price_asc',
        limit: 5,
      });
    }
  });
});
