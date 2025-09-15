# Docker 部署指南

## 1. 安装 Docker Desktop

### Windows 系统
1. 访问 https://www.docker.com/products/docker-desktop/
2. 下载并安装 Docker Desktop for Windows
3. 启动 Docker Desktop
4. 确保 Docker 服务正在运行

### 验证安装
```bash
docker --version
docker-compose --version
```

## 2. 构建和运行应用

### 使用 Docker Compose（推荐）
```bash
# 构建并启动所有服务
docker-compose up --build

# 后台运行
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 使用 Docker 命令
```bash
# 构建镜像
docker build -t webai-demo .

# 运行容器
docker run -p 3000:3000 -e JWT_SECRET=your-secret webai-demo
```

## 3. 访问应用

- 应用地址：http://localhost:3000
- 数据库端口：5432

## 4. 常用命令

```bash
# 查看运行中的容器
docker ps

# 查看所有容器
docker ps -a

# 查看镜像
docker images

# 删除容器
docker rm <container_id>

# 删除镜像
docker rmi <image_id>

# 清理未使用的资源
docker system prune
```

## 5. 环境变量配置

创建 `.env.local` 文件：
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://postgres:password@localhost:5432/webai_demo
```

## 6. 数据库迁移

```bash
# 进入容器执行 Prisma 迁移
docker-compose exec app npx prisma migrate dev
docker-compose exec app npx prisma generate
```
