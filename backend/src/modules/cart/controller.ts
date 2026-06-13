import { Request, Response } from 'express';
import { parseId } from '../../lib/parse-id';
import * as cartService from './service';

export async function get(req: Request, res: Response) {
  const cart = await cartService.getCart(req.user!.id);
  res.json({ success: true, data: cart });
}

export async function addItem(req: Request, res: Response) {
  await cartService.addItem(req.user!.id, req.body.book_id, req.body.quantity);
  // Trả cả giỏ mới thay vì chỉ dòng vừa thêm — FE invalidate 1 lần là đủ dữ liệu
  const cart = await cartService.getCart(req.user!.id);
  res.status(201).json({ success: true, data: cart });
}

export async function updateItem(req: Request, res: Response) {
  await cartService.updateItem(req.user!.id, parseId(req.params.bookId), req.body.quantity);
  const cart = await cartService.getCart(req.user!.id);
  res.json({ success: true, data: cart });
}

export async function removeItem(req: Request, res: Response) {
  await cartService.removeItem(req.user!.id, parseId(req.params.bookId));
  const cart = await cartService.getCart(req.user!.id);
  res.json({ success: true, data: cart });
}

export async function merge(req: Request, res: Response) {
  const cart = await cartService.mergeGuestCart(req.user!.id, req.body);
  res.json({ success: true, data: cart });
}
