import { useState, useCallback, useEffect } from 'react';
import type { Message, UseChatReturn, ApiMessage, ChatRequest } from '../types';
import { THINKING_CONTENT } from '../types';


export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>(undefined);

  const triggerAutoScroll = useCallback(() => {
    // 这个函数由父组件的自动滚动逻辑处理
  }, []);

  // 获取历史记录
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/chat');
        if (!response.ok) throw new Error('Failed to fetch history');
        
        const data = await response.json();
        
        if (data && data.messages) {
          const loadedMessages: Message[] = data.messages.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
            id: msg.id, role: msg.role as 'user' | 'assistant', content: msg.content, timestamp: new Date(msg.createdAt),
          }));
          setMessages(loadedMessages);
          setChatId(data.id);
          triggerAutoScroll(); // 加载完历史记录后也触发一次滚动
        }
      } catch (error) {
        console.error('获取历史记录失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [triggerAutoScroll]); // 依赖数组中加入 triggerAutoScroll

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setChatId(undefined);
  }, []);

  const loadChat = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat?chatId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('加载会话失败');
      const data = await res.json();
      if (data && data.messages) {
        const loadedMessages: Message[] = data.messages.map((msg: { id: string; role: string; content: string; createdAt: string }) => ({
          id: msg.id, role: msg.role as 'user' | 'assistant', content: msg.content, timestamp: new Date(msg.createdAt),
        }));
        setMessages(loadedMessages);
        setChatId(data.id);
        triggerAutoScroll();
      }
    } catch (e) {
      console.error('加载会话失败:', e);
    } finally {
      setIsLoading(false);
    }
  }, [triggerAutoScroll]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim(), timestamp: new Date() };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    triggerAutoScroll(); // 3. 在发送用户消息后，触发滚动

    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: THINKING_CONTENT, timestamp: new Date() },
    ]);
    triggerAutoScroll(); // 4. 在显示“思考中”后，触发滚动

    try {
      const apiMessages: ApiMessage[] = newMessages.map(msg => ({ role: msg.role, content: msg.content }));
      const requestBody: ChatRequest = { messages: apiMessages, chatId: chatId };

      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });

      const newChatId = response.headers.get('X-Chat-Id');
      if (newChatId && newChatId !== chatId) setChatId(newChatId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API 请求失败: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');
      
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
        triggerAutoScroll(); // 5. 在流式响应的每一帧后，触发滚动
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
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, chatId, triggerAutoScroll]);

  return {
    messages, input, isLoading, chatId,
    handleInputChange, handleSubmit, clearMessages,
    triggerAutoScroll, // 6. 确保 triggerAutoScroll 被导出
    loadChat,
  };
}