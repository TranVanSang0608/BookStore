import { Request, Response } from 'express';
import { AppError } from '../../middleware/error';
import * as locationsService from './service';

export async function getProvinces(_req: Request, res: Response) {
  const provinces = await locationsService.listProvinces();
  res.json({ success: true, data: provinces });
}

export async function getWards(req: Request, res: Response) {
  const code = req.params.code;
  // Express 5: param có thể là string[] nếu bị lặp trên URL — chỉ nhận string đơn
  if (typeof code !== 'string') throw new AppError(400, 'Mã tỉnh không hợp lệ');

  const wards = await locationsService.listWardsOfProvince(code);
  res.json({ success: true, data: wards });
}
