// Test lib/deepseek (KHÔNG mock) — xác nhận chặn sớm khi quên cấu hình key.
import { createChatCompletion } from '../lib/deepseek';

describe('lib/deepseek', () => {
  it('ném lỗi rõ ràng khi thiếu DEEPSEEK_API_KEY (không cố gọi API)', () => {
    const saved = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    try {
      expect(() => createChatCompletion({ model: 'x', messages: [] })).toThrow('Thiếu DEEPSEEK_API_KEY');
    } finally {
      if (saved !== undefined) process.env.DEEPSEEK_API_KEY = saved;
    }
  });
});
