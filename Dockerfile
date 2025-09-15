# 使用官方 Node.js 18 Alpine 镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（包括开发依赖，因为构建时需要）
RUN npm ci

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建应用（使用 Webpack 而不是 Turbopack 以避免生产构建问题）
# 跳过 ESLint 检查以避免 Prisma 生成代码的错误
RUN npx next build --no-lint

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]
