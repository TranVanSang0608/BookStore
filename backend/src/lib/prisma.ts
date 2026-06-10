import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// Prisma 7: client nói chuyện với Postgres qua driver adapter (thư viện `pg`),
// thay cho query engine nhị phân của Prisma 5/6 — nên phải truyền adapter vào constructor.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Singleton: cả app dùng chung 1 PrismaClient (1 connection pool).
// Mọi module import { prisma } từ đây, KHÔNG tự new PrismaClient().
export const prisma = new PrismaClient({ adapter });
