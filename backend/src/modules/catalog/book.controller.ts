import { Request, Response } from 'express';
import { parseId } from '../../lib/parse-id';
import { adminListBooksQuerySchema, listBooksQuerySchema } from './book.schemas';
import * as bookService from './book.service';

export async function list(req: Request, res: Response) {
  // Middleware validate() chỉ chạy trên req.body — query string parse tại đây.
  // Schema dùng .catch() nên parse KHÔNG BAO GIỜ throw: giá trị sai → dùng mặc định.
  const query = listBooksQuerySchema.parse(req.query);
  const result = await bookService.listBooks(query);
  res.json({ success: true, data: result });
}

export async function detail(req: Request, res: Response) {
  const book = await bookService.getBookBySlug(String(req.params.slug));
  res.json({ success: true, data: book });
}

// GET /api/books/batch?ids=1,2,3 — lấy nhiều sách theo id cho guest cart.
// Parse thủ công: tách dấu phẩy, chỉ giữ số nguyên dương, cap 50 id (giỏ tối đa ~50 dòng);
// giá trị rác bị lọc êm thay vì 400 — id không tồn tại đơn giản là vắng mặt trong kết quả
export async function batch(req: Request, res: Response) {
  const ids = String(req.query.ids ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 50);
  const books = await bookService.listBooksByIds(ids);
  res.json({ success: true, data: books });
}

// ---------- Admin ----------

export async function adminList(req: Request, res: Response) {
  const query = adminListBooksQuerySchema.parse(req.query);
  const result = await bookService.adminListBooks(query);
  res.json({ success: true, data: result });
}

export async function adminDetail(req: Request, res: Response) {
  const book = await bookService.getAdminBookById(parseId(req.params.id));
  res.json({ success: true, data: book });
}

export async function create(req: Request, res: Response) {
  const book = await bookService.createBook(req.body);
  res.status(201).json({ success: true, data: book });
}

export async function update(req: Request, res: Response) {
  const book = await bookService.updateBook(parseId(req.params.id), req.body);
  res.json({ success: true, data: book });
}

export async function setActive(req: Request, res: Response) {
  const book = await bookService.setBookActive(parseId(req.params.id), req.body.is_active);
  res.json({ success: true, data: book });
}
