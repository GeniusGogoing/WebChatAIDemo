import { useState, useCallback } from 'react';
import type { Message, UseChatReturn, ApiMessage } from '../types';

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 触发自动滚动的函数（空实现，由父组件处理）
  const triggerAutoScroll = useCallback(() => {
    // 这个函数由父组件的自动滚动逻辑处理
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

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // 触发自动滚动到新消息
    triggerAutoScroll();

    try {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'AI 正在思考中...',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // 触发自动滚动到 AI 思考消息
      triggerAutoScroll();

      const apiMessages: ApiMessage[] = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages
        }),
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let accumulatedContent = '';
      let isFirstChunk = true;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let chunk: string;
        if (typeof value === 'string') {
          chunk = value;
        } else {
          chunk = new TextDecoder('utf-8').decode(value, { stream: true });
        }
        
        if (isFirstChunk) {
          accumulatedContent = chunk;
          isFirstChunk = false;
        } else {
          accumulatedContent += chunk;
        }
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
        
        // 在流式更新时触发自动滚动
        triggerAutoScroll();
      }
    } catch (error: unknown) {
      console.error('聊天错误:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `抱歉，发生了错误，请稍后重试。${error instanceof Error ? ` (${error.message})` : ''}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // 触发自动滚动到错误消息
      triggerAutoScroll();
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, triggerAutoScroll]);

  return {
    messages,
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
    clearMessages,
    triggerAutoScroll,
  };
}
