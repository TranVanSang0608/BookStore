import { Request, Response } from 'express';
import { parseId } from '../../lib/parse-id';
import * as authorService from './author.service';

export async function list(_req: Request, res: Response) {
  const authors = await authorService.listAuthors();
  res.json({ success: true, data: authors });
}

export async function detail(req: Request, res: Response) {
  const author = await authorService.getAuthorWithBooks(parseId(req.params.id));
  res.json({ success: true, data: author });
}

// ---------- Admin ----------

export async function create(req: Request, res: Response) {
  const author = await authorService.createAuthor(req.body);
  res.status(201).json({ success: true, data: author });
}

export async function update(req: Request, res: Response) {
  const author = await authorService.updateAuthor(parseId(req.params.id), req.body);
  res.json({ success: true, data: author });
}

export async function remove(req: Request, res: Response) {
  await authorService.deleteAuthor(parseId(req.params.id));
  res.json({ success: true, message: 'Đã xóa tác giả' });
}
