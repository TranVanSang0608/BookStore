import { z } from 'zod';

// Body của POST /api/chat: mảng tin nhắn hội thoại (FE gửi vài lượt gần nhất).
// role chỉ 'user' | 'assistant' — system prompt do BACKEND tự ghép, FE không gửi
// (nếu cho FE gửi system prompt thì khách có thể tự đổi vai trò bot → mất kiểm soát).
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1, 'Nội dung không được để trống').max(2000),
      }),
    )
    .min(1, 'Cần ít nhất 1 tin nhắn')
    .max(20, 'Quá nhiều tin nhắn trong một lượt'),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatHistoryMessage = ChatRequest['messages'][number];

// Zod cho ARGUMENTS mà model sinh ra khi gọi tool search_books.
// Model là AI nên có thể bịa field thừa hoặc sai kiểu → schema này lọc sạch + ép đúng kiểu
// TRƯỚC khi chạm DB (tất cả field optional: model có thể chỉ truyền vài tham số).
export const searchBooksArgsSchema = z.object({
  query: z.string().trim().min(1).max(200).optional().catch(undefined),
  category: z.string().trim().max(100).optional().catch(undefined),
  price_min: z.coerce.number().int().nonnegative().optional().catch(undefined),
  price_max: z.coerce.number().int().nonnegative().optional().catch(undefined),
  in_stock_only: z.boolean().optional().catch(undefined),
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc']).optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(10).optional().catch(undefined),
});

export type SearchBooksArgs = z.infer<typeof searchBooksArgsSchema>;
