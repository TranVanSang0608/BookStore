import { Request, Response } from 'express';
import { parseId } from '../../lib/parse-id';
import * as wishlistService from './service';

// Tất cả route wishlist đã qua middleware auth (xem routes.ts) → req.user chắc chắn có.

export async function list(req: Request, res: Response) {
  res.json({ success: true, data: await wishlistService.listWishlist(req.user!.id) });
}

export async function ids(req: Request, res: Response) {
  res.json({ success: true, data: await wishlistService.getWishlistedBookIds(req.user!.id) });
}

export async function toggle(req: Request, res: Response) {
  const result = await wishlistService.toggleWishlist(req.user!.id, parseId(req.params.bookId));
  res.json({ success: true, data: result });
}
