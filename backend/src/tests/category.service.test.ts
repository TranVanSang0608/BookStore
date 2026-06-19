// Unit test cho category service — mock Prisma, không chạm DB thật
import { prisma } from '../lib/prisma';
import { listCategories } from '../modules/catalog/category.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
  },
}));

const mockCategoryFindMany = prisma.category.findMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listCategories (B-Count)', () => {
  it('đếm số sách ĐANG BÁN (is_active) mỗi thể loại qua _count có filter; sắp theo tên', async () => {
    mockCategoryFindMany.mockResolvedValue([]);

    await listCategories();

    const arg = mockCategoryFindMany.mock.calls[0][0];
    expect(arg.orderBy).toEqual({ name: 'asc' });
    expect(arg.include._count.select.books).toEqual({ where: { book: { is_active: true } } });
  });

  it('làm phẳng _count.books → book_count và KHÔNG lộ _count ra ngoài', async () => {
    mockCategoryFindMany.mockResolvedValue([
      { id: 1, name: 'Văn học', slug: 'van-hoc', description: null, _count: { books: 12 } },
      { id: 2, name: 'Kinh tế', slug: 'kinh-te', description: null, _count: { books: 0 } },
    ]);

    const res = await listCategories();

    expect(res).toEqual([
      { id: 1, name: 'Văn học', slug: 'van-hoc', description: null, book_count: 12 },
      { id: 2, name: 'Kinh tế', slug: 'kinh-te', description: null, book_count: 0 },
    ]);
    expect(res[0]).not.toHaveProperty('_count');
  });
});
