// Unit test cho verifyEmail / resendVerification + tính bền vững của register khi gửi mail lỗi.
import { consumeEmailToken, createEmailToken } from '../lib/email-token';
import { prisma } from '../lib/prisma';
import { register, resendVerification, verifyEmail } from '../modules/auth/service';
import { sendVerificationEmail } from '../modules/notification/auth-email';

jest.mock('../lib/prisma', () => ({
  prisma: { user: { update: jest.fn(), findUnique: jest.fn(), create: jest.fn() } },
}));
jest.mock('../lib/email-token', () => ({ consumeEmailToken: jest.fn(), createEmailToken: jest.fn() }));
jest.mock('../modules/notification/auth-email', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// signToken (trong register) cần JWT_SECRET — đặt giá trị test, không đụng .env thật
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-cho-jest';
});

beforeEach(() => jest.clearAllMocks());

describe('verifyEmail', () => {
  it('tiêu thụ token verify_email → bật email_verified', async () => {
    (consumeEmailToken as jest.Mock).mockResolvedValue(5);
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const res = await verifyEmail('raw');
    expect(consumeEmailToken).toHaveBeenCalledWith('raw', 'verify_email');
    expect((prisma.user.update as jest.Mock).mock.calls[0][0]).toMatchObject({
      where: { id: 5 },
      data: { email_verified: true },
    });
    expect(res).toEqual({ verified: true });
  });
});

describe('resendVerification', () => {
  it('user chưa verify → tạo token + gửi mail', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 3,
      email: 'a@test.com',
      name: 'A',
      email_verified: false,
    });
    (createEmailToken as jest.Mock).mockResolvedValue('raw');

    const res = await resendVerification(3);
    expect(createEmailToken).toHaveBeenCalledWith(3, 'verify_email');
    expect(sendVerificationEmail).toHaveBeenCalledWith('a@test.com', 'A', 'raw');
    expect(res).toEqual({ sent: true });
  });

  it('email đã verify → 400, KHÔNG gửi', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 3,
      email: 'a@test.com',
      name: 'A',
      email_verified: true,
    });
    await expect(resendVerification(3)).rejects.toMatchObject({ statusCode: 400 });
    expect(createEmailToken).not.toHaveBeenCalled();
  });

  it('user không tồn tại → 404', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(resendVerification(9)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('register — gửi verify lỗi không làm vỡ đăng ký', () => {
  it('createEmailToken throw → vẫn trả { user, token }', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // email chưa tồn tại
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'n@test.com',
      name: 'N',
      role: 'user',
      email_verified: false,
    });
    (createEmailToken as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await register({ email: 'n@test.com', password: 'password123', name: 'N' });
    expect(res.user).toMatchObject({ email: 'n@test.com' });
    expect(res.token).toBeTruthy();
  });
});
