// Unit test cho user service — mock Prisma như auth.service.test.ts
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { changePassword, getMe } from '../modules/user/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

beforeAll(() => {
  // changePassword cấp token mới → signToken cần JWT_SECRET (giá trị test, không đụng .env thật)
  process.env.JWT_SECRET = 'test-secret-cho-jest';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getMe', () => {
  it('ném AppError 404 khi user không còn trong DB (token cũ của user đã xóa)', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(getMe(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('changePassword', () => {
  const hashCu = () => bcrypt.hash('mat-khau-cu', 4); // cost 4 cho test nhanh

  it('ném AppError 400 khi mật khẩu hiện tại sai', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, password_hash: await hashCu() });

    await expect(
      changePassword(1, { current_password: 'sai-be-bet', new_password: 'mat-khau-moi-8ky-tu' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(mockUpdate).not.toHaveBeenCalled(); // sai thì tuyệt đối không update
  });

  it('lưu hash MỚI + tăng token_version + trả token mới khi mật khẩu hiện tại đúng', async () => {
    const oldHash = await hashCu();
    mockFindUnique.mockResolvedValue({ id: 1, password_hash: oldHash });
    mockUpdate.mockResolvedValue({ id: 1, role: 'user', token_version: 1 });

    const token = await changePassword(1, {
      current_password: 'mat-khau-cu',
      new_password: 'mat-khau-moi-8ky-tu',
    });

    const updateArg = mockUpdate.mock.calls[0][0].data;
    expect(updateArg.password_hash).not.toBe('mat-khau-moi-8ky-tu'); // không lưu plaintext
    expect(updateArg.password_hash).not.toBe(oldHash); // hash mới khác hash cũ
    expect(await bcrypt.compare('mat-khau-moi-8ky-tu', updateArg.password_hash)).toBe(true); // verify được
    expect(updateArg.token_version).toEqual({ increment: 1 }); // vô hiệu token cũ
    expect(typeof token).toBe('string'); // trả token mới cho phiên hiện tại
  });

  it('ném AppError 400 với tài khoản không có password (OAuth sau này)', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, password_hash: null });

    await expect(
      changePassword(1, { current_password: 'x', new_password: 'mat-khau-moi-8ky-tu' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
