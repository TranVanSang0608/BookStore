import bcrypt from 'bcrypt';
import { signToken } from '../../lib/jwt';
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
  // TĂNG token_version → mọi JWT cũ (kể cả token kẻ khác đã chiếm) bị middleware auth từ chối ngay.
  // Cấp token MỚI (tv mới) cho chính phiên đang đổi để user KHÔNG bị đăng xuất; chỉ các phiên
  // khác (đang giữ token cũ) mới mất hiệu lực. FE thay token cũ bằng token này.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password_hash, token_version: { increment: 1 } },
  });
  return signToken({ sub: updated.id, role: updated.role, tv: updated.token_version });
}
