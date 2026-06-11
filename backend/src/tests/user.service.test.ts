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

  it('lưu hash MỚI (không phải plaintext) khi mật khẩu hiện tại đúng', async () => {
    const oldHash = await hashCu();
    mockFindUnique.mockResolvedValue({ id: 1, password_hash: oldHash });
    mockUpdate.mockResolvedValue({});

    await changePassword(1, { current_password: 'mat-khau-cu', new_password: 'mat-khau-moi-8ky-tu' });

    const savedHash = mockUpdate.mock.calls[0][0].data.password_hash;
    expect(savedHash).not.toBe('mat-khau-moi-8ky-tu'); // không lưu plaintext
    expect(savedHash).not.toBe(oldHash); // hash mới khác hash cũ
    expect(await bcrypt.compare('mat-khau-moi-8ky-tu', savedHash)).toBe(true); // verify được
  });

  it('ném AppError 400 với tài khoản không có password (OAuth sau này)', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, password_hash: null });

    await expect(
      changePassword(1, { current_password: 'x', new_password: 'mat-khau-moi-8ky-tu' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
