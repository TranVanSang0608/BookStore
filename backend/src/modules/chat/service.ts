import type OpenAI from 'openai';
import { createChatCompletion, DEEPSEEK_MODEL } from '../../lib/deepseek';
import { logger } from '../../lib/logger';
import { AppError } from '../../middleware/error';
import type { ChatHistoryMessage } from './schemas';
import { SYSTEM_PROMPT } from './system-prompt';
import { runSearchBooks, searchBooksTool, type ChatBook } from './tools';

const MAX_HISTORY = 6; // chỉ gửi 6 lượt gần nhất: đủ nhớ ngữ cảnh mà không phình token / tốn tiền
const MAX_TOKENS = 512; // chặn câu trả lời quá dài → kiểm soát chi phí

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const FALLBACK_REPLY =
  'Mình chưa rõ ý bạn lắm. Bạn có thể nói rõ hơn về thể loại hoặc cuốn sách bạn muốn tìm không?';

export interface ChatResult {
  reply: string;
  books: ChatBook[];
}

// Bộ não chatbot: ghép system prompt + lịch sử → gọi DeepSeek → nếu model đòi tìm sách thì
// chạy công cụ rồi đưa kết quả lại cho model (tool loop 1 vòng) → trả { reply, books }.
export async function chat(history: ChatHistoryMessage[]): Promise<ChatResult> {
  // 1) Ghép [system prompt] + [vài lượt gần nhất]. System prompt LUÔN do backend kiểm soát.
  const recent = history.slice(-MAX_HISTORY);
  const messages: Msg[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...recent.map((m) => ({ role: m.role, content: m.content }) as Msg),
  ];

  try {
    // 2) Gọi DeepSeek lần 1 — kèm khai báo tool để model TỰ quyết định có cần tìm sách không
    const first = await createChatCompletion({
      model: DEEPSEEK_MODEL,
      messages,
      tools: [searchBooksTool],
      max_tokens: MAX_TOKENS,
    });

    const assistantMsg = first.choices[0]?.message;
    const toolCalls = assistantMsg?.tool_calls ?? [];

    // 3) Không gọi tool → model trả lời thẳng (vd FAQ ship/thanh toán/đổi trả)
    if (!assistantMsg || toolCalls.length === 0) {
      return { reply: assistantMsg?.content?.trim() || FALLBACK_REPLY, books: [] };
    }

    // 4) Có gọi tool → chạy search_books, gói kết quả thành message role:'tool'.
    //    PHẢI trả 1 message cho MỖI tool_call (khớp tool_call_id) nếu không lần gọi 2 sẽ lỗi.
    let lastBooks: ChatBook[] = [];
    const toolMessages: Msg[] = [];

    for (const call of toolCalls) {
      if (call.type === 'function' && call.function.name === 'search_books') {
        const args = safeJsonParse(call.function.arguments);
        const { books, matched } = await runSearchBooks(args);
        lastBooks = books; // books trả về FE = kết quả công cụ gần nhất
        toolMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          // đưa CẢ cờ matched + số lượng vào để model biết "khớp" hay "gần đúng" mà chọn cách nói
          content: JSON.stringify({ matched, count: books.length, books }),
        });
      } else {
        // model lỡ gọi công cụ không tồn tại → vẫn phải phản hồi để khớp tool_call_id
        toolMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: 'Công cụ không khả dụng' }),
        });
      }
    }

    // 5) Gọi DeepSeek lần 2 với kết quả công cụ (KHÔNG kèm tools nữa → ép model trả lời bằng
    //    chữ, không gọi tool tiếp). Đây là câu trả lời cuối, dựa trên sách THẬT.
    const second = await createChatCompletion({
      model: DEEPSEEK_MODEL,
      messages: [...messages, assistantMsg as Msg, ...toolMessages],
      max_tokens: MAX_TOKENS,
    });

    const reply = second.choices[0]?.message?.content?.trim() || FALLBACK_REPLY;
    return { reply, books: lastBooks };
  } catch (err) {
    // Lỗi có thể từ DeepSeek (timeout/quota) HOẶC từ DB (listBooks) — log đầy đủ STACK để
    // debug đúng nguồn (không chỉ message); người dùng vẫn chỉ thấy 1 câu xin lỗi chung.
    logger.error('Chat error', { error: err instanceof Error ? (err.stack ?? err.message) : err });
    throw new AppError(503, 'Trợ lý đang bận, bạn thử lại sau ít phút nhé.');
  }
}

// Arguments của tool do model sinh ra là CHUỖI JSON → parse an toàn (model có thể sinh JSON hỏng)
function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {}; // hỏng thì coi như không có tham số, Zod sẽ về mặc định
  }
}
