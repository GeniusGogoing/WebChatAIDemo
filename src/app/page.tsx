"use client";

import React, { useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { useAutoScroll } from "../hooks/useAutoScroll";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";

export default function Home() {
  const { messages, input, isLoading, handleInputChange, handleSubmit, clearMessages } = useChat();
  
  // 使用自动滚动 Hook
  const { scrollRef, shouldAutoScroll, scrollToBottom, resetAutoScroll } = useAutoScroll({
    enabled: true,
    behavior: 'smooth',
    threshold: 20  // 降低阈值，用户只需要向上滚动 20px 就能暂停
  });

  // 当消息更新时触发自动滚动（只有在应该自动滚动时才执行）
  useEffect(() => {
    if (messages.length > 0 && shouldAutoScroll) {
      console.log('📝 消息更新，准备自动滚动', { 
        messageCount: messages.length, 
        shouldAutoScroll,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 50) + '...'
      });
      // 使用防抖来减少频繁滚动和闪烁
      const timeoutId = setTimeout(() => {
        // 使用 requestAnimationFrame 确保 DOM 更新后再滚动 避免布局闪烁问题
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }, 30); // 30ms 防抖，减少闪烁

      return () => clearTimeout(timeoutId);
    } else if (messages.length > 0 && !shouldAutoScroll) {
      console.log('⏸️ 消息更新但自动滚动已暂停', { 
        messageCount: messages.length, 
        shouldAutoScroll 
      });
    }
    
    return undefined; // 确保所有代码路径都有返回值
  }, [messages, shouldAutoScroll, scrollToBottom]);

  // 当用户发送新消息时重置自动滚动状态
  const handleSubmitWithScroll = async (e: React.FormEvent) => {
    resetAutoScroll();
    await handleSubmit(e);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="p-4 border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl text-sky-600 font-semibold">Web AI ChatAgent</h1>
          <button
            onClick={clearMessages}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            disabled={messages.length === 0}
          >
            清空对话
          </button>
        </div>
      </header>

      {/* Chat Container */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <h2 className="text-xl font-medium mb-2">开始与 AI 对话</h2>
                <p className="text-sm">输入你的问题，AI 会为你提供帮助</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 border-t bg-white/80 backdrop-blur-sm shadow-sm">
        <div>
          <ChatInput
            input={input}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleSubmitWithScroll}
          />
        </div>
      </footer>
    </div>
  );
}
