import { Request, Response } from 'express';
import * as settingsService from './service';

// Công khai: Footer/Navbar đọc thông tin shop để hiển thị (không có gì riêng tư).
export async function getPublic(_req: Request, res: Response) {
  res.json({ success: true, data: await settingsService.getSiteSettings() });
}

// Admin: cập nhật thông tin shop. Trả về toàn bộ thiết lập sau khi lưu để FE cập nhật ngay.
export async function adminUpdate(req: Request, res: Response) {
  res.json({ success: true, data: await settingsService.updateSiteSettings(req.body) });
}
