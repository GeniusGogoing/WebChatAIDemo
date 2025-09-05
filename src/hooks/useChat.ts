import { useState, useCallback } from 'react';
import type { Message, UseChatReturn, ApiMessage, ChatRequest } from '../types';
import { THINKING_CONTENT } from '../types';

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>(undefined); // 新增 chatId 状态

  // 触发自动滚动的函数（空实现，由父组件处理）
  const triggerAutoScroll = useCallback(() => {
    // 这个函数由父组件的自动滚动逻辑处理
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setChatId(undefined); // 清空对话时也清空 chatId
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);


    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: THINKING_CONTENT,
        timestamp: new Date(),
      },
    ]);

    triggerAutoScroll();

    try {
      const apiMessages: ApiMessage[] = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const requestBody: ChatRequest = {
        messages: apiMessages,
        chatId: chatId, // 在请求体中带上 chatId
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // 从响应头中获取新的 chatId
      const newChatId = response.headers.get('X-Chat-Id');
      if (newChatId && newChatId !== chatId) {
        setChatId(newChatId);
      }
      
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }
      
      let accumulatedContent = '';
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );

        triggerAutoScroll();
      }
    } catch (error: unknown) {
      console.error('聊天错误:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: `抱歉，发生了错误: ${error instanceof Error ? error.message : '未知错误'}` }
            : msg
        )
      );
      triggerAutoScroll();
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, chatId,triggerAutoScroll]);

  return {
    messages,
    input,
    isLoading,
    chatId, // 导出 chatId
    handleInputChange,
    handleSubmit,
    clearMessages,
    triggerAutoScroll,
  };
}