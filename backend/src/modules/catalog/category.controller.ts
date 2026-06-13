import { Request, Response } from 'express';
import { parseId } from '../../lib/parse-id';
import * as categoryService from './category.service';

export async function list(_req: Request, res: Response) {
  const categories = await categoryService.listCategories();
  res.json({ success: true, data: categories });
}

// ---------- Admin ----------

export async function create(req: Request, res: Response) {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.updateCategory(parseId(req.params.id), req.body);
  res.json({ success: true, data: category });
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(parseId(req.params.id));
  res.json({ success: true, message: 'Đã xóa thể loại' });
}
