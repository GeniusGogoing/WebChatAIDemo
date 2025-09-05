import { PrismaClient } from '@/generated/prisma';

// 声明一个全局变量来缓存 Prisma Client 实例
declare global {
  var prisma: PrismaClient | undefined;
}

// 创建 Prisma Client 的单例
// 在开发环境中，我们会将实例缓存在全局变量中，
// 避免因为 Next.js 的热重载导致创建过多的连接。
// 在生产环境中，每次都会创建一个新的实例。
export const prisma = global.prisma || new PrismaClient();

// 如果不是在生产环境，就将创建的实例赋值给全局变量
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;