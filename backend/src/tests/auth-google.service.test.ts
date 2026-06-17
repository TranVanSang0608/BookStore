// Unit test cho đăng nhập Google (D60) — mock cả lib/google (verify token) lẫn lib/prisma.
// Không gọi Google thật, không chạm DB: chỉ kiểm tra logic tìm-hoặc-tạo user + cấp token.
import { loginWithGoogle } from '../modules/auth/service';
import { verifyGoogleIdToken } from '../lib/google';
import { prisma } from '../lib/prisma';

jest.mock('../lib/google', () => ({ verifyGoogleIdToken: jest.fn() }));
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockVerify = verifyGoogleIdToken as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-cho-jest';
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'; // có cấu hình → không rơi vào nhánh 500
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loginWithGoogle', () => {
  it('tạo user mới (password_hash=null, email_verified=true) khi email chưa tồn tại', async () => {
    mockVerify.mockResolvedValue({
      email: 'Moi@Gmail.com',
      name: 'Người Mới',
      email_verified: true,
      sub: 'g-123',
    });
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 10,
      email: 'moi@gmail.com',
      name: 'Người Mới',
      phone: null,
      role: 'user',
      email_verified: true,
      password_hash: null,
      created_at: new Date(),
    });

    const result = await loginWithGoogle('fake-credential');

    // email được normalize lowercase + tạo user không có mật khẩu
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: 'moi@gmail.com' } });
    const created = mockCreate.mock.calls[0][0].data;
    expect(created.email).toBe('moi@gmail.com');
    expect(created.password_hash).toBeNull();
    expect(created.email_verified).toBe(true);

    expect(typeof result.token).toBe('string');
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('đăng nhập vào tài khoản sẵn có (không tạo trùng) khi email đã tồn tại', async () => {
    mockVerify.mockResolvedValue({
      email: 'cu@test.vn',
      name: 'Google Name',
      email_verified: true,
      sub: 'g-999',
    });
    mockFindUnique.mockResolvedValue({
      id: 5,
      email: 'cu@test.vn',
      name: 'Tên Cũ',
      phone: '0900000000',
      role: 'user',
      email_verified: true,
      password_hash: 'hash-cu',
      created_at: new Date(),
    });

    const result = await loginWithGoogle('fake-credential');

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result.user.id).toBe(5);
    expect(result.user).not.toHaveProperty('password_hash'); // password_hash bị loại khỏi response
  });

  it('bật email_verified nếu user cũ chưa verify (Google đã xác minh hộ)', async () => {
    mockVerify.mockResolvedValue({
      email: 'chuaverify@test.vn',
      name: 'X',
      email_verified: true,
      sub: 'g-1',
    });
    mockFindUnique.mockResolvedValue({
      id: 7,
      email: 'chuaverify@test.vn',
      name: 'X',
      role: 'user',
      email_verified: false,
      password_hash: 'h',
      created_at: new Date(),
    });
    mockUpdate.mockResolvedValue({
      id: 7,
      email: 'chuaverify@test.vn',
      name: 'X',
      role: 'user',
      email_verified: true,
      password_hash: 'h',
      created_at: new Date(),
    });

    await loginWithGoogle('fake-credential');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { email_verified: true },
    });
  });

  it('ném AppError 401 khi token Google không hợp lệ', async () => {
    mockVerify.mockRejectedValue(new Error('Invalid token'));

    await expect(loginWithGoogle('token-gia')).rejects.toMatchObject({ statusCode: 401 });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('TỪ CHỐI (401) khi Google báo email CHƯA xác minh — chống chiếm tài khoản qua email người khác', async () => {
    mockVerify.mockResolvedValue({
      email: 'chuaverify@gmail.com',
      name: 'X',
      email_verified: false, // điểm mấu chốt
      sub: 'g-2',
    });

    await expect(loginWithGoogle('cred')).rejects.toMatchObject({ statusCode: 401 });
    // Không được đụng tới DB khi email chưa verify
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('ném AppError 500 khi server thiếu cấu hình GOOGLE_CLIENT_ID (lỗi hệ thống, không phải lỗi user)', async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      await expect(loginWithGoogle('cred')).rejects.toMatchObject({ statusCode: 500 });
      expect(mockVerify).not.toHaveBeenCalled(); // chặn trước cả khi verify token
    } finally {
      process.env.GOOGLE_CLIENT_ID = saved;
    }
  });

  it('race 2 request cùng email: create dính P2002 → đọc lại user kia vừa tạo, KHÔNG 500', async () => {
    mockVerify.mockResolvedValue({
      email: 'race@gmail.com',
      name: 'Race',
      email_verified: true,
      sub: 'g-3',
    });
    const existing = {
      id: 99,
      email: 'race@gmail.com',
      name: 'Race',
      role: 'user',
      email_verified: true,
      password_hash: null,
      created_at: new Date(),
    };
    // Lần 1: chưa thấy user → đi tạo; create ném P2002; lần findUnique thứ 2 thấy user kia đã tạo
    mockFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    mockCreate.mockRejectedValue({ code: 'P2002' });

    const result = await loginWithGoogle('cred');

    expect(result.user.id).toBe(99);
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
  });
});
