"use client";

import React, { useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { useAutoScroll } from "../hooks/useAutoScroll";
import MessageBubble from "../components/MessageBubble";
import ChatInput from "../components/ChatInput";
import SessionsSidebar from "../components/SessionsSidebar";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { messages, input, isLoading, handleInputChange, handleSubmit, clearMessages, loadChat, chatId } = useChat();
  const { user, logout } = useAuth();
  
  // 使用自动滚动 Hook
  const { scrollRef, shouldAutoScroll, scrollToBottom, resetAutoScroll } = useAutoScroll({
    enabled: true,
    behavior: 'smooth',
    threshold: 20
  });

  useEffect(() => {
    if (messages.length > 0 && shouldAutoScroll) {
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }, 30);
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [messages, shouldAutoScroll, scrollToBottom]);

  const handleSubmitWithScroll = async (e: React.FormEvent) => {
    resetAutoScroll();
    await handleSubmit(e);
  };

  return (
    <div className="flex h-screen">
      <SessionsSidebar
        activeId={chatId}
        onSelect={loadChat}
        onNewChat={clearMessages}
      />

      <div className="flex flex-col flex-1 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <header className="p-4 border-b bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-sky-600 font-semibold">Web AI ChatAgent</h1>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">{user.name || user.email}</span>
                  <button onClick={() => logout()} className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">退出</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">登录</Link>
                  <Link href="/register" className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">注册</Link>
                </>
              )}
              <button
                onClick={clearMessages}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                disabled={messages.length === 0}
              >
                清空对话
              </button>
            </div>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <h2 className="text-xl font-medium mb-2">开始与 AI 对话</h2>
                  <p className="text-sm">输入你的问题，AI 会为你提供帮助</p>
                  {!user && (
                    <p className="text-sm mt-2">未登录会话仅保存在本地。<Link href="/login" className="text-blue-600 underline ml-1">登录</Link> 以云端保存与跨设备同步。</p>
                  )}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))
            )}
          </div>
        </main>

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
    </div>
  );
}