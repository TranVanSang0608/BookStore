// Unit test cho auth service — chạy: npm test
// Nguyên tắc: mock Prisma (không chạm DB thật) để test NHANH và chỉ test logic nghiệp vụ.
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/error';
import { login, register } from '../modules/auth/service';
import { prisma } from '../lib/prisma';

// jest.mock thay TOÀN BỘ module lib/prisma bằng object giả —
// service gọi prisma.user.findUnique sẽ chạy vào jest.fn() thay vì DB thật
jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Ép kiểu để gọi được mockResolvedValue trong test
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;

beforeAll(() => {
  // signToken cần secret — đặt giá trị test, không đụng .env thật
  process.env.JWT_SECRET = 'test-secret-cho-jest';
});

beforeEach(() => {
  jest.clearAllMocks(); // reset mock giữa các test để không dính trạng thái của nhau
});

describe('register', () => {
  const input = { email: 'a@test.vn', password: 'matkhau123', name: 'Người Test' };

  it('ném AppError 409 khi email đã tồn tại', async () => {
    mockFindUnique.mockResolvedValue({ id: 1 }); // giả lập: DB đã có user này

    await expect(register(input)).rejects.toThrow(AppError);
    await expect(register(input)).rejects.toMatchObject({ statusCode: 409 });
    expect(mockCreate).not.toHaveBeenCalled(); // không được tạo user mới
  });

  it('hash password trước khi lưu (không lưu plaintext) và trả về token', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 1,
      email: input.email,
      name: input.name,
      phone: null,
      role: 'user',
      created_at: new Date(),
    });

    const result = await register(input);

    // Lấy data đã đưa vào prisma.user.create để kiểm tra password
    const createdData = mockCreate.mock.calls[0][0].data;
    expect(createdData.password_hash).not.toBe(input.password); // không phải plaintext
    expect(createdData.password_hash).toMatch(/^\$2[aby]\$/); // đúng định dạng bcrypt

    expect(typeof result.token).toBe('string');
    expect(result.user).not.toHaveProperty('password_hash');
  });
});

describe('register — normalize email', () => {
  it('lưu email lowercase dù user gõ chữ hoa + thừa khoảng trắng', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 1,
      email: 'viethoa@test.vn',
      name: 'X',
      phone: null,
      role: 'user',
      created_at: new Date(),
    });

    await register({ email: ' VietHoa@Test.VN ', password: 'matkhau123', name: 'X' });

    // Cả bước check trùng lẫn bước lưu đều phải dùng email đã normalize
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: 'viethoa@test.vn' } });
    expect(mockCreate.mock.calls[0][0].data.email).toBe('viethoa@test.vn');
  });
});

describe('login', () => {
  it('tìm user bằng email lowercase dù gõ chữ hoa', async () => {
    mockFindUnique.mockResolvedValue(null); // không cần user thật — chỉ kiểm tra cách query

    await expect(login({ email: 'VietHoa@Test.VN', password: 'x' })).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: 'viethoa@test.vn' } });
  });
});

describe('login', () => {
  it('ném AppError 401 khi email không tồn tại', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(login({ email: 'khongton-tai@test.vn', password: 'x' })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('ném AppError 401 khi sai mật khẩu', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      email: 'a@test.vn',
      password_hash: await bcrypt.hash('matkhau-dung', 4), // cost 4 cho test nhanh
      role: 'user',
    });

    await expect(login({ email: 'a@test.vn', password: 'matkhau-sai' })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('trả về token + user không chứa password_hash khi đăng nhập đúng', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      email: 'a@test.vn',
      name: 'Người Test',
      phone: null,
      password_hash: await bcrypt.hash('matkhau-dung', 4),
      role: 'user',
      created_at: new Date(),
    });

    const result = await login({ email: 'a@test.vn', password: 'matkhau-dung' });

    expect(typeof result.token).toBe('string');
    expect(result.user).not.toHaveProperty('password_hash');
    expect(result.user.email).toBe('a@test.vn');
  });
});
