import { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as addressService from './service';

// :id trên URL là string (Express 5 còn cho phép string[] nếu param lặp) —
// chỉ chấp nhận đúng 1 số nguyên dương, mọi thứ khác trả 400 ngay
function parseId(raw: string | string[]): number {
  const id = Number(raw);
  if (typeof raw !== 'string' || !Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'ID không hợp lệ');
  }
  return id;
}

export async function list(req: Request, res: Response) {
  const addresses = await addressService.listAddresses(req.user!.id);
  res.json({ success: true, data: addresses });
}

export async function create(req: Request, res: Response) {
  const address = await addressService.createAddress(req.user!.id, req.body);
  res.status(201).json({ success: true, data: address });
}

export async function update(req: Request, res: Response) {
  const address = await addressService.updateAddress(req.user!.id, parseId(req.params.id), req.body);
  res.json({ success: true, data: address });
}

export async function remove(req: Request, res: Response) {
  await addressService.deleteAddress(req.user!.id, parseId(req.params.id));
  res.json({ success: true, message: 'Đã xóa địa chỉ' });
}

export async function setDefault(req: Request, res: Response) {
  await addressService.setDefaultAddress(req.user!.id, parseId(req.params.id));
  res.json({ success: true, message: 'Đã đặt làm địa chỉ mặc định' });
}
