// 消息相关类型
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// API 请求/响应类型
export interface ChatRequest {
    chatId? : string | undefined;
  messages: ApiMessage[];
}

export interface ChatResponse {
  error?: string;
  details?: string;
  stack?: string | undefined;
}

// 组件 Props 类型
export interface MessageBubbleProps {
  message: Message;
}

export interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export interface MarkdownRendererProps {
  content: string;
}

// Hook 返回类型
export interface UseChatReturn {
    chatId: string | undefined;
    messages: Message[];
    input: string;
    isLoading: boolean;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    clearMessages: () => void;
    // 用于触发自动滚动的函数
    triggerAutoScroll: () => void;
    // 新增：加载指定会话
    loadChat: (id: string) => Promise<void>;
  }

// API 消息类型（用于与后端通信）
export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 错误类型
export interface ChatError {
  message: string;
  code?: string;
  details?: unknown;
}

// 流式响应类型
export interface StreamChunk {
  done: boolean;
  value?: Uint8Array | string;
}

// 常量类型
export const THINKING_CONTENT = 'AI 正在思考中...' as const;

// 用户角色类型
export type UserRole = 'user' | 'assistant';

// 消息状态类型
export type MessageStatus = 'sending' | 'sent' | 'error' | 'thinking';
