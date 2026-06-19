import { prisma } from '../../lib/prisma';
import { toSlug } from '../../lib/slug';
import { AppError } from '../../middleware/error';
import type { CategoryInput } from './category.schemas';

export async function listCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    // Đếm số sách ĐANG BÁN (is_active=true) trong mỗi thể loại — qua bảng junction books.
    // _count có filter where (Prisma filteredRelationCount) nên không cần query đếm riêng từng thể loại.
    include: { _count: { select: { books: { where: { book: { is_active: true } } } } } },
  });
  // Làm phẳng _count.books → book_count cho FE dễ đọc (ẩn cấu trúc _count của Prisma)
  return categories.map(({ _count, ...c }) => ({ ...c, book_count: _count.books }));
}

// ---------- Phần admin ----------

async function getCategoryOr404(id: number) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(404, 'Không tìm thấy thể loại');
  return category;
}

// Slug sinh từ name lúc tạo, trùng thì thêm -2, -3... (giống cách làm với Book)
async function uniqueCategorySlug(name: string) {
  const base = toSlug(name) || 'the-loai';
  let slug = base;
  for (let i = 2; await prisma.category.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

export async function createCategory(input: CategoryInput) {
  const slug = await uniqueCategorySlug(input.name);
  return prisma.category.create({ data: { ...input, slug } });
}

export async function updateCategory(id: number, input: CategoryInput) {
  await getCategoryOr404(id);
  // Chỉ đổi name/description — slug giữ nguyên để URL filter (/books?category=...) không chết
  return prisma.category.update({ where: { id }, data: input });
}

export async function deleteCategory(id: number) {
  await getCategoryOr404(id);
  // Xóa thẳng được: bảng junction BookCategory có onDelete: Cascade —
  // các dòng liên kết tự mất, sách chỉ "rớt nhãn" thể loại chứ không bị ảnh hưởng
  await prisma.category.delete({ where: { id } });
}
