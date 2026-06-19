import { z } from 'zod';

// Schema cho query string của GET /api/books.
// Query string luôn là string → z.coerce đổi sang số.
// .catch(...) = nếu giá trị sai/thiếu thì dùng mặc định thay vì báo lỗi —
// người dùng gõ ?page=abc vẫn xem được trang 1, không cần thấy lỗi 400.
export const listBooksQuerySchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  category: z.string().max(100).optional().catch(undefined), // slug của category
  price_min: z.coerce.number().int().nonnegative().optional().catch(undefined),
  price_max: z.coerce.number().int().nonnegative().optional().catch(undefined),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).catch('newest'),
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(12),
});

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;

// GET /api/books/bestsellers?limit=10 — số sách bán chạy muốn lấy (1..20, mặc định 10)
export const bestsellersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).catch(10),
});

export type BestsellersQuery = z.infer<typeof bestsellersQuerySchema>;

// Bảng admin chỉ cần tìm theo tên + phân trang (không cần filter giá/thể loại)
export const adminListBooksQuerySchema = listBooksQuerySchema.pick({
  q: true,
  page: true,
  limit: true,
});

export type AdminListBooksQuery = z.infer<typeof adminListBooksQuerySchema>;

export const createBookSchema = z.object({
  title: z.string().trim().min(1, 'Tên sách không được để trống').max(255),
  description: z.string().max(5000).optional(),
  price: z.number().int('Giá phải là số nguyên').positive('Giá phải lớn hơn 0'),
  stock_quantity: z.number().int('Tồn kho phải là số nguyên').min(0, 'Tồn kho không được âm'),
  author_id: z.number().int().positive('Vui lòng chọn tác giả'),
  category_ids: z.array(z.number().int().positive()).min(1, 'Chọn ít nhất 1 thể loại'),
  cover_image_url: z.url('URL ảnh bìa không hợp lệ').optional(),
  isbn: z.string().max(20).optional(),
  publisher: z.string().max(255).optional(),
  published_year: z.number().int().min(1900, 'Năm xuất bản không hợp lệ').max(2100, 'Năm xuất bản không hợp lệ').optional(),
  language: z.string().max(50).optional(),
  pages: z.number().int().positive('Số trang phải lớn hơn 0').optional(),
});

// Update nhận cùng bộ field với create — slug KHÔNG đổi theo title (URL ổn định),
// còn ẩn/hiện sách có endpoint riêng PUT /:id/active
export const updateBookSchema = createBookSchema;

export const setActiveSchema = z.object({
  is_active: z.boolean('is_active phải là true hoặc false'),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
