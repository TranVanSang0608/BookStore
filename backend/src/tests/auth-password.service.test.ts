// Unit test cho forgotPassword / resetPassword — mock prisma + email-token + auth-email.
// Trọng tâm: chống dò tài khoản (anti-enumeration) + mật khẩu mới được HASH.
import bcrypt from 'bcrypt';
import { consumeEmailToken, createEmailToken } from '../lib/email-token';
import { prisma } from '../lib/prisma';
import { forgotPassword, resetPassword } from '../modules/auth/service';
import { sendPasswordResetEmail } from '../modules/notification/auth-email';

jest.mock('../lib/prisma', () => ({ prisma: { user: { findUnique: jest.fn(), update: jest.fn() } } }));
jest.mock('../lib/email-token', () => ({ createEmailToken: jest.fn(), consumeEmailToken: jest.fn() }));
jest.mock('../modules/notification/auth-email', () => ({
  sendPasswordResetEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

// Xả hết microtask đang chờ — forgotPassword gửi mail kiểu fire-and-forget (IIFE void),
// flush để chắc chắn IIFE đã chạy xong trước khi assert. Bền với refactor: thêm await vào
// IIFE sau này cũng không làm test flaky (không phụ thuộc thứ tự microtask tinh tế).
const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('forgotPassword (chống dò tài khoản)', () => {
  it('email tồn tại + có mật khẩu → gửi link reset, trả thông báo chung', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'a@test.com',
      name: 'A',
      password_hash: 'h',
    });
    (createEmailToken as jest.Mock).mockResolvedValue('raw');

    const res = await forgotPassword('a@test.com');
    await flushMicrotasks();
    expect(createEmailToken).toHaveBeenCalledWith(1, 'reset_password');
    expect(sendPasswordResetEmail).toHaveBeenCalled();
    expect(res.message).toMatch(/Nếu email/);
  });

  it('email KHÔNG tồn tại → KHÔNG gửi, vẫn trả CÙNG thông báo', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await forgotPassword('ghost@test.com');
    await flushMicrotasks();
    expect(createEmailToken).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(res.message).toMatch(/Nếu email/);
  });

  it('tài khoản OAuth (password_hash null) → KHÔNG gửi', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 2,
      email: 'g@test.com',
      name: 'G',
      password_hash: null,
    });

    await forgotPassword('g@test.com');
    await flushMicrotasks();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  it('tiêu thụ token reset → hash mật khẩu mới → cập nhật user', async () => {
    (consumeEmailToken as jest.Mock).mockResolvedValue(9);
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    await resetPassword('raw-token', 'newpassword123');

    expect(consumeEmailToken).toHaveBeenCalledWith('raw-token', 'reset_password');
    const updateArg = (prisma.user.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 9 });
    // KHÔNG lưu plaintext — phải là chuỗi hash bcrypt khớp khi compare
    expect(updateArg.data.password_hash).not.toBe('newpassword123');
    expect(await bcrypt.compare('newpassword123', updateArg.data.password_hash)).toBe(true);
  });
});
