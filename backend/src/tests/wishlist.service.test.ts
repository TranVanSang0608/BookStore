// Unit test cho wishlist service — mock prisma.
import { prisma } from '../lib/prisma';
import { getWishlistedBookIds, listWishlist, toggleWishlist } from '../modules/wishlist/service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    book: { findFirst: jest.fn() },
    wishlist: { deleteMany: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  },
}));

const bookFindFirst = prisma.book.findFirst as jest.Mock;
const wlDeleteMany = prisma.wishlist.deleteMany as jest.Mock;
const wlCreate = prisma.wishlist.create as jest.Mock;
const wlFindMany = prisma.wishlist.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('toggleWishlist', () => {
  it('chưa thích (deleteMany count=0) → thêm, trả wishlisted=true', async () => {
    bookFindFirst.mockResolvedValue({ id: 10, is_active: true });
    wlDeleteMany.mockResolvedValue({ count: 0 });
    wlCreate.mockResolvedValue({});

    const res = await toggleWishlist(1, 10);
    expect(res).toEqual({ wishlisted: true });
    expect(wlCreate).toHaveBeenCalledWith({ data: { user_id: 1, book_id: 10 } });
  });

  it('đã thích (deleteMany count=1) → bỏ, trả wishlisted=false, KHÔNG create', async () => {
    bookFindFirst.mockResolvedValue({ id: 10 });
    wlDeleteMany.mockResolvedValue({ count: 1 });

    const res = await toggleWishlist(1, 10);
    expect(res).toEqual({ wishlisted: false });
    expect(wlCreate).not.toHaveBeenCalled();
  });

  it('race: 2 request cùng thêm → create ném P2002 → vẫn wishlisted=true (không 500)', async () => {
    bookFindFirst.mockResolvedValue({ id: 10 });
    wlDeleteMany.mockResolvedValue({ count: 0 });
    wlCreate.mockRejectedValue({ code: 'P2002' });

    await expect(toggleWishlist(1, 10)).resolves.toEqual({ wishlisted: true });
  });

  it('sách không tồn tại / đã ẩn → 404', async () => {
    bookFindFirst.mockResolvedValue(null);
    await expect(toggleWishlist(1, 999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('listWishlist', () => {
  it('làm phẳng rows.book, lọc chỉ sách active', async () => {
    wlFindMany.mockResolvedValue([{ book: { id: 10, title: 'X' } }, { book: { id: 11, title: 'Y' } }]);

    const res = await listWishlist(1);
    expect(res).toEqual([
      { id: 10, title: 'X' },
      { id: 11, title: 'Y' },
    ]);
    expect(wlFindMany.mock.calls[0][0].where).toMatchObject({ user_id: 1, book: { is_active: true } });
  });
});

describe('getWishlistedBookIds', () => {
  it('trả mảng book_id', async () => {
    wlFindMany.mockResolvedValue([{ book_id: 10 }, { book_id: 11 }]);
    expect(await getWishlistedBookIds(1)).toEqual([10, 11]);
  });
});
