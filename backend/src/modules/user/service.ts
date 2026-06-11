import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { PUBLIC_USER_SELECT } from '../../utils/publicUser';
import type { ChangePasswordInput, UpdateProfileInput } from './schemas';

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_SELECT,
  });
  // Token còn hạn nhưng user đã bị xóa khỏi DB (hiếm, nhưng phải xử lý)
  if (!user) throw new AppError(404, 'Không tìm thấy người dùng');
  return user;
}

export async function updateMe(userId: number, input: UpdateProfileInput) {
  // Chỉ cho sửa name + phone. Email KHÔNG cho đổi (tránh phức tạp verify email lại);
  // role càng không — user tự nâng quyền là lỗ hổng bảo mật kinh điển (mass assignment)
  return prisma.user.update({
    where: { id: userId },
    data: { name: input.name, phone: input.phone },
    select: PUBLIC_USER_SELECT,
  });
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password_hash) {
    throw new AppError(400, 'Tài khoản này không đăng nhập bằng mật khẩu');
  }

  // Bắt buộc xác nhận mật khẩu hiện tại: chống trường hợp máy đang đăng nhập
  // bị người khác mượn và đổi mật khẩu chiếm tài khoản
  const currentOk = await bcrypt.compare(input.current_password, user.password_hash);
  if (!currentOk) throw new AppError(400, 'Mật khẩu hiện tại không đúng');

  const password_hash = await bcrypt.hash(input.new_password, 10);
  await prisma.user.update({ where: { id: userId }, data: { password_hash } });
  // Không trả gì — FE chỉ cần biết thành công. JWT cũ vẫn còn hạn (chấp nhận được
  // với đồ án; muốn thu hồi token ngay cần bảng RefreshToken — tier NICE)
}
