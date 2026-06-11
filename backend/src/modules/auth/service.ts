import bcrypt from 'bcrypt';
import { signToken } from '../../lib/jwt';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import { PUBLIC_USER_SELECT } from '../../utils/publicUser';
import type { LoginInput, RegisterInput } from './schemas';

export async function register(input: RegisterInput) {
  // Normalize email: Postgres unique phân biệt hoa/thường, không normalize thì
  // "A@test.com" và "a@test.com" thành 2 tài khoản khác nhau
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'Email đã được đăng ký');

  // bcrypt cost 10: mỗi lần hash ~100ms — đủ chậm để chống dò pass, đủ nhanh cho UX
  const password_hash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: { email, password_hash, name: input.name, phone: input.phone },
    select: PUBLIC_USER_SELECT,
  });

  // Đăng ký xong cấp token luôn — user không phải login lại lần nữa
  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

export async function login(input: LoginInput) {
  // Normalize giống register — user gõ "A@Test.com" vẫn login được tài khoản "a@test.com"
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Cùng MỘT thông báo cho "email không tồn tại" và "sai mật khẩu":
  // không cho kẻ tấn công dò được email nào đã đăng ký (user enumeration)
  const invalidError = new AppError(401, 'Email hoặc mật khẩu không đúng');

  // password_hash null = tài khoản OAuth (NICE sau này) — không login bằng password được
  if (!user?.password_hash) throw invalidError;

  const passwordOk = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordOk) throw invalidError;

  const token = signToken({ sub: user.id, role: user.role });

  // Loại password_hash ra khỏi object trước khi trả về
  const { password_hash: _ignored, ...publicUser } = user;
  return { user: publicUser, token };
}
