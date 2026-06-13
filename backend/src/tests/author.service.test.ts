// Unit test cho author service — mock Prisma, không chạm DB thật
import { prisma } from '../lib/prisma';
import { deleteAuthor, getAuthorWithBooks, updateAuthor } from '../modules/catalog/author.service';

jest.mock('../lib/prisma', () => ({
  prisma: {
    author: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    book: {
      count: jest.fn(),
    },
  },
}));

const mockAuthorFindUnique = prisma.author.findUnique as jest.Mock;
const mockAuthorDelete = prisma.author.delete as jest.Mock;
const mockBookCount = prisma.book.count as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAuthorWithBooks', () => {
  it('ném 404 khi tác giả không tồn tại', async () => {
    mockAuthorFindUnique.mockResolvedValue(null);

    await expect(getAuthorWithBooks(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('chỉ lấy sách đang bán (is_active=true) cho trang public', async () => {
    mockAuthorFindUnique.mockResolvedValue({ id: 1, name: 'Nguyễn Nhật Ánh', books: [] });

    await getAuthorWithBooks(1);

    expect(mockAuthorFindUnique.mock.calls[0][0].include.books.where).toEqual({ is_active: true });
  });
});

describe('updateAuthor', () => {
  it('ném 404 khi tác giả không tồn tại', async () => {
    mockAuthorFindUnique.mockResolvedValue(null);

    await expect(updateAuthor(999, { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteAuthor — chặn xóa khi còn sách tham chiếu', () => {
  it('ném 400 khi tác giả còn sách (tránh lỗi FK P2003 khó hiểu)', async () => {
    mockAuthorFindUnique.mockResolvedValue({ id: 1, name: 'Nguyễn Nhật Ánh' });
    mockBookCount.mockResolvedValue(4);

    await expect(deleteAuthor(1)).rejects.toMatchObject({ statusCode: 400 });
    expect(mockAuthorDelete).not.toHaveBeenCalled();
  });

  it('xóa được khi tác giả không còn sách nào', async () => {
    mockAuthorFindUnique.mockResolvedValue({ id: 2, name: 'Tác Giả Mới' });
    mockBookCount.mockResolvedValue(0);

    await deleteAuthor(2);

    expect(mockAuthorDelete).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});
