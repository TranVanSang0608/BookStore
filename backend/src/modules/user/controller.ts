import { Request, Response } from 'express';
import * as userService from './service';

// req.user! an toàn ở đây: mọi route trong module này đều đứng sau middleware auth
// (xem routes.ts — router.use(auth)), không có user thì đã bị chặn 401 từ trước.

export async function getMe(req: Request, res: Response) {
  const user = await userService.getMe(req.user!.id);
  res.json({ success: true, data: user });
}

export async function updateMe(req: Request, res: Response) {
  const user = await userService.updateMe(req.user!.id, req.body);
  res.json({ success: true, data: user });
}

export async function changePassword(req: Request, res: Response) {
  await userService.changePassword(req.user!.id, req.body);
  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
}
