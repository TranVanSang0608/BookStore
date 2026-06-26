// Unit test cho lib/email-token — mock Prisma (chỉ kiểm logic hash + tiêu thụ token).
import { consumeEmailToken, createEmailToken, hashToken } from '../lib/email-token';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => {
  // createEmailToken gói khóa-hàng-User ($queryRaw FOR UPDATE) + updateMany (vô hiệu token cũ)
  // + create trong 1 transaction CALLBACK → mock $transaction tự gọi callback với chính prisma mock.
  const prismaMock: Record<string, unknown> = {
    emailToken: { create: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    $queryRaw: jest.fn(),
  };
  prismaMock.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(prismaMock));
  return { prisma: prismaMock };
});

beforeEach(() => jest.clearAllMocks());

describe('hashToken', () => {
  it('cùng input ra cùng hash, đúng dạng 64 ký tự hex', () => {
    const h = hashToken('abc');
    expect(h).toBe(hashToken('abc'));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('input khác ra hash khác', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });
});

describe('createEmailToken', () => {
  it('lưu HASH (không lưu token thật), trả token thật, và vô hiệu token cũ cùng loại', async () => {
    const raw = await createEmailToken(7, 'verify_email');

    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    const createArg = (prisma.emailToken.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.token_hash).toBe(hashToken(raw)); // lưu đúng hash của token vừa sinh
    expect(createArg.data.token_hash).not.toBe(raw); // KHÔNG lưu token thật vào DB
    expect(createArg.data.user_id).toBe(7);
    expect(createArg.data.type).toBe('verify_email');

    // Vô hiệu token cũ cùng (user, type) còn hiệu lực: updateMany set used_at
    const updArg = (prisma.emailToken.updateMany as jest.Mock).mock.calls[0][0];
    expect(updArg.where).toMatchObject({ user_id: 7, type: 'verify_email', used_at: null });
    expect(updArg.data.used_at).toBeInstanceOf(Date);
  });
});

describe('consumeEmailToken', () => {
  it('token hợp lệ (count=1) → trả user_id', async () => {
    (prisma.emailToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.emailToken.findUnique as jest.Mock).mockResolvedValue({ user_id: 42 });
    await expect(consumeEmailToken('raw-token', 'verify_email')).resolves.toBe(42);
  });

  it('token sai / hết hạn / đã dùng (count=0) → ném lỗi 400', async () => {
    (prisma.emailToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    await expect(consumeEmailToken('raw-token', 'verify_email')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('claim được (count=1) nhưng row biến mất (findUnique null) → 400, không 500 (m5)', async () => {
    (prisma.emailToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.emailToken.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(consumeEmailToken('raw-token', 'verify_email')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
