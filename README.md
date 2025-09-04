# Web AI ChatAgent

一个基于 Next.js 和 Google Gemini 的现代化 AI 聊天应用。

## ✨ 功能特性

- 🤖 **AI 聊天**：基于 Google Gemini 2.0 Flash 模型
- 📝 **Markdown 支持**：支持代码高亮、表格、列表等
- 🎨 **现代 UI**：使用 Tailwind CSS 构建的响应式界面
- ⚡ **流式响应**：实时显示 AI 回复过程
- 📱 **自动滚动**：智能跟随最新消息
- 🔒 **类型安全**：完整的 TypeScript 支持

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- Google AI API Key

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/你的用户名/web-ai-chatagent.git
cd web-ai-chatagent
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 创建 .env.local 文件
echo "GOOGLE_API_KEY=你的_Google_API_密钥" > .env.local
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 🛠️ 技术栈

- **前端框架**：Next.js 15.5.2
- **UI 库**：React 19.1.0
- **样式**：Tailwind CSS 4
- **AI 模型**：Google Gemini 2.0 Flash
- **语言**：TypeScript
- **状态管理**：React Hooks
- **Markdown 渲染**：react-markdown

## 📁 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/chat/       # API 路由
│   ├── layout.tsx      # 根布局
│   └── page.tsx        # 主页面
├── components/         # React 组件
│   ├── ChatInput.tsx   # 聊天输入组件
│   ├── MessageBubble.tsx # 消息气泡组件
│   └── MarkdownRenderer.tsx # Markdown 渲染器
├── hooks/              # 自定义 Hooks
│   ├── useChat.ts      # 聊天逻辑
│   └── useAutoScroll.ts # 自动滚动逻辑
└── types/              # TypeScript 类型定义
    └── index.ts        # 全局类型
```

## 🎯 核心功能

### 智能聊天
- 基于 Google Gemini 2.0 Flash 模型
- 支持多轮对话
- 流式响应显示

### 自动滚动
- 新消息自动滚动到底部
- 用户向上滚动时暂停自动跟随
- 回到底部时恢复自动滚动

### Markdown 渲染
- 代码语法高亮
- 表格、列表支持
- 链接自动识别

## 🔧 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

## 📝 环境变量

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `GOOGLE_API_KEY` | Google AI API 密钥 | ✅ |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Google Gemini](https://ai.google.dev/) - AI 模型
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [React Markdown](https://github.com/remarkjs/react-markdown) - Markdown 渲染