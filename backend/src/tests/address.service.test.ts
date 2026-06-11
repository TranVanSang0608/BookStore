// Unit test cho address service — mock Prisma, không chạm DB thật
import { prisma } from '../lib/prisma';
import { createAddress, setDefaultAddress } from '../modules/address/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    address: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
    ward: {
      findUnique: jest.fn(),
    },
    // $transaction giả: dạng callback thì gọi callback với chính prisma mock (đóng vai tx),
    // dạng mảng thì chờ tất cả promise — đủ để kiểm tra service GỌI ĐÚNG các lệnh
    $transaction: jest.fn(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]),
    ),
  },
}));

const mockWardFindUnique = prisma.ward.findUnique as jest.Mock;
const mockCount = prisma.address.count as jest.Mock;
const mockCreate = prisma.address.create as jest.Mock;
const mockUpdateMany = prisma.address.updateMany as jest.Mock;
const mockUpdate = prisma.address.update as jest.Mock;
const mockFindFirst = prisma.address.findFirst as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

const inputHopLe = {
  recipient_name: 'Nguyễn Văn A',
  phone: '0912345678',
  province_code: '1',
  ward_code: '4',
  street_detail: '12 Phố Huế',
};

const wardBaDinh = {
  code: '4',
  name: 'Phường Ba Đình',
  province_code: '1',
  province: { code: '1', name: 'Thành phố Hà Nội' },
};

describe('createAddress', () => {
  it('ném 400 khi ward_code không tồn tại trong DB', async () => {
    mockWardFindUnique.mockResolvedValue(null);

    await expect(createAddress(1, { ...inputHopLe, ward_code: '99999' })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('ném 400 khi ward không thuộc tỉnh đã chọn (FE gửi cặp code lệch nhau)', async () => {
    // Ward của Hà Nội (province_code "1") nhưng client nói nó thuộc tỉnh "79"
    mockWardFindUnique.mockResolvedValue(wardBaDinh);

    await expect(createAddress(1, { ...inputHopLe, province_code: '79' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('lưu NAME tra từ DB (không phải từ client) và địa chỉ đầu tiên tự thành default', async () => {
    mockWardFindUnique.mockResolvedValue(wardBaDinh);
    mockCount.mockResolvedValue(0); // user chưa có địa chỉ nào
    mockCreate.mockResolvedValue({ id: 10 });

    await createAddress(1, inputHopLe); // chú ý: KHÔNG gửi is_default

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.province_name).toBe('Thành phố Hà Nội'); // name từ DB
    expect(data.ward_name).toBe('Phường Ba Đình');
    expect(data.is_default).toBe(true); // địa chỉ đầu tiên → default dù không yêu cầu
  });

  it('khi tạo địa chỉ default mới thì bỏ default cũ trước (trong transaction)', async () => {
    mockWardFindUnique.mockResolvedValue(wardBaDinh);
    mockCount.mockResolvedValue(2); // đã có địa chỉ khác
    mockCreate.mockResolvedValue({ id: 11 });

    await createAddress(1, { ...inputHopLe, is_default: true });

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { user_id: 1, is_default: true },
      data: { is_default: false },
    });
  });
});

describe('setDefaultAddress', () => {
  it('ném 404 khi địa chỉ không thuộc về user (chống sửa địa chỉ người khác)', async () => {
    mockFindFirst.mockResolvedValue(null); // không tìm thấy trong địa chỉ CỦA user này

    await expect(setDefaultAddress(1, 999)).rejects.toMatchObject({ statusCode: 404 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('bỏ default cũ + set default mới atomic qua $transaction', async () => {
    mockFindFirst.mockResolvedValue({ id: 5, user_id: 1 });

    await setDefaultAddress(1, 5);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { user_id: 1, is_default: true },
      data: { is_default: false },
    });
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 5 }, data: { is_default: true } });
  });
});
