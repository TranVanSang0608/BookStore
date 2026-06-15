// Unit test cho admin CRUD voucher — mock prisma.
import { prisma } from '../lib/prisma';
import {
  createVoucher,
  deleteVoucher,
  getVoucher,
  toggleVoucher,
  updateVoucher,
} from '../modules/voucher/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    voucher: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: { count: jest.fn() },
  },
}));

const v = prisma.voucher as unknown as Record<string, jest.Mock>;
const orderCount = prisma.order.count as jest.Mock;

beforeEach(() => jest.clearAllMocks());

const fixedInput = {
  discount_type: 'fixed' as const,
  discount_value: 10000,
  min_order: 0,
  per_user_limit: 1,
  is_active: true,
};

describe('createVoucher', () => {
  it('chuẩn hóa code thành UPPERCASE + bỏ khoảng trắng', async () => {
    v.findUnique.mockResolvedValue(null);
    v.create.mockResolvedValue({ id: 1 });

    await createVoucher({ code: '  sale10 ', ...fixedInput });
    expect(v.create.mock.calls[0][0].data.code).toBe('SALE10');
  });

  it('code đã tồn tại → 409', async () => {
    v.findUnique.mockResolvedValue({ id: 9 });
    await expect(createVoucher({ code: 'X', ...fixedInput })).rejects.toMatchObject({ statusCode: 409 });
    expect(v.create).not.toHaveBeenCalled();
  });
});

describe('updateVoucher', () => {
  it('đổi code → chuẩn hóa + kiểm trùng (loại trừ chính nó)', async () => {
    v.findUnique.mockResolvedValue({ id: 1 });
    v.findFirst.mockResolvedValue(null);
    v.update.mockResolvedValue({});

    await updateVoucher(1, { code: ' new10 ' });
    expect(v.findFirst.mock.calls[0][0].where).toMatchObject({ code: 'NEW10', id: { not: 1 } });
    expect(v.update.mock.calls[0][0].data.code).toBe('NEW10');
  });
});

describe('toggleVoucher', () => {
  it('lật is_active', async () => {
    v.findUnique.mockResolvedValue({ id: 1, is_active: true });
    v.update.mockResolvedValue({});

    await toggleVoucher(1);
    expect(v.update.mock.calls[0][0].data).toEqual({ is_active: false });
  });
});

describe('deleteVoucher', () => {
  it('mã đã có đơn dùng → 400, KHÔNG xóa (tắt thay vì xóa)', async () => {
    v.findUnique.mockResolvedValue({ id: 1 });
    orderCount.mockResolvedValue(2);

    await expect(deleteVoucher(1)).rejects.toMatchObject({ statusCode: 400 });
    expect(v.delete).not.toHaveBeenCalled();
  });

  it('mã chưa có đơn → xóa', async () => {
    v.findUnique.mockResolvedValue({ id: 1 });
    orderCount.mockResolvedValue(0);
    v.delete.mockResolvedValue({});

    await deleteVoucher(1);
    expect(v.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe('getVoucher', () => {
  it('không tồn tại → 404', async () => {
    v.findUnique.mockResolvedValue(null);
    await expect(getVoucher(99)).rejects.toMatchObject({ statusCode: 404 });
  });
});
