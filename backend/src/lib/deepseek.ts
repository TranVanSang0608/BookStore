import OpenAI from 'openai';

// Client gọi DeepSeek API. DeepSeek TƯƠNG THÍCH chuẩn OpenAI nên dùng luôn SDK `openai`,
// chỉ đổi baseURL + key (giống lib/cloudinary, lib/google — 1 instance dùng chung cả app).
// Key CHỈ nằm ở backend (.env) — FE không bao giờ thấy, tránh lộ key = người khác xài tiền của mình.

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('Thiếu DEEPSEEK_API_KEY trong .env');
    client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
      timeout: 30_000, // 30s — DeepSeek treo/chậm thì bỏ cuộc sớm, không bắt user chờ vô tận
    });
  }
  return client;
}

// Đổi model 1 chỗ bằng env, không phải sửa code. v4-flash: rẻ/nhanh, đủ cho tư vấn sách.
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';

type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

// Bọc lời gọi DeepSeek + nhét sẵn `thinking: disabled`.
// `thinking` KHÔNG thuộc chuẩn OpenAI nên type của SDK không khai field này → ép kiểu để
// truyền thẳng (DeepSeek đọc nó để TẮT suy luận dài: tư vấn sách không cần reasoning → nhanh/rẻ).
export function createChatCompletion(
  params: ChatParams,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return getClient().chat.completions.create({
    ...params,
    thinking: { type: 'disabled' },
  } as ChatParams);
}
