import { Request, Response } from 'express';
import { parseId } from '../../lib/parse-id';
import * as voucherService from './service';

// Cần đăng nhập (để kiểm per_user_limit theo user). Trả số tiền giảm preview cho checkout.
export async function preview(req: Request, res: Response) {
  const result = await voucherService.previewVoucher(req.user!.id, req.body.code);
  res.json({ success: true, data: result });
}

// ---------- Admin ----------

export async function adminList(_req: Request, res: Response) {
  res.json({ success: true, data: await voucherService.listVouchers() });
}

export async function adminDetail(req: Request, res: Response) {
  res.json({ success: true, data: await voucherService.getVoucher(parseId(req.params.id)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ success: true, data: await voucherService.createVoucher(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ success: true, data: await voucherService.updateVoucher(parseId(req.params.id), req.body) });
}

export async function toggle(req: Request, res: Response) {
  res.json({ success: true, data: await voucherService.toggleVoucher(parseId(req.params.id)) });
}

export async function remove(req: Request, res: Response) {
  await voucherService.deleteVoucher(parseId(req.params.id));
  res.json({ success: true, message: 'Đã xóa mã giảm giá' });
}
