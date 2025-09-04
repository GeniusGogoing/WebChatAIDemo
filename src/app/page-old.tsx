"use client";

import React, { useState } from "react";
import MarkdownRenderer from "../components/MarkdownRenderer";

// 定义消息类型
interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  // 消息状态
  const [messages, setMessages] = useState<Message[]>([]);
  // 输入状态
  const [input, setInput] = useState("");
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    console.log('开始处理消息提交');

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
    };

    // 添加用户消息
    setMessages(prev => [...prev, userMessage]);
    
    // 清空输入框
    setInput("");
    setIsLoading(true);

    console.log('设置加载状态为 true');

    try {
      console.log('开始调用 API');

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: "AI 正在思考中...",
      };

      console.log('创建思考提示消息:', assistantMessage);
      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        console.log('更新后的消息列表:', newMessages);
        return newMessages;
      });

      // 调用聊天 API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      console.log('API 响应状态:', response.status);

      if (!response.ok) {
        throw new Error('API 请求失败');
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }


      // 读取流式响应
      let accumulatedContent = '';
      let isFirstChunk = true;
      
      console.log('开始读取流式响应');
      
      while (true) {
        console.log('准备读取下一个数据块');
        const { done, value } = await reader.read();
        console.log('读取结果:', { done, value });
        
        if (done) {
          console.log('流式响应结束');
          break;
        }

        // 调试：查看原始数据
        console.log('原始数据块:', value);
        console.log('数据类型:', typeof value);
        
        // API 现在直接发送文本，不需要解码
        let chunk;
        if (typeof value === 'string') {
            chunk = value;
        } else {
            // 如果是 Uint8Array，则解码
            chunk = new TextDecoder('utf-8').decode(value, { stream: true });
        }
        
        console.log('处理后的文本块:', chunk);
        
        // 如果是第一个数据块，替换思考提示
        if (isFirstChunk) {
          accumulatedContent = chunk;
          isFirstChunk = false;
          console.log('第一个数据块，替换思考提示');
        } else {
          accumulatedContent += chunk;
          console.log('追加数据块');
        }
        
        console.log('累积内容:', accumulatedContent);
        
        // 更新消息内容
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }
      
      console.log('流式响应处理完成，最终内容:', accumulatedContent);
    } catch (error) {
      console.error('聊天错误:', error);
      // 添加错误消息
      const errorMessage: Message = {
        id: Date.now() + 2,
        role: "assistant",
        content: "抱歉，发生了错误，请稍后重试。",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="p-4 border-b bg-white/80 backdrop-blur-sm shadow-sm">
        <h1 className="flex justify-center text-2xl text-sky-600 font-semibold">Web AI ChatAgent</h1>
      </header>

      {/* Chat Container */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Chat Messages */}
          {messages.map((m) => (
            <div key={m.id} className="flex items-start space-x-3">
              {/* 头像/标识 */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                m.role === "user" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-300 text-gray-700"
              }`}>
                {m.role === "user" ? "你" : "AI"}
              </div>
              
              {/* 消息内容 */}
              <div className="flex-1 min-w-0">
                <div className={`inline-block px-4 py-3 rounded-lg ${
                  m.role === "user" 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                }`}>
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : m.content === "AI 正在思考中..." || m.content.startsWith("AI 正在思考中") ? (
                    <div className="inline-flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gray-600">AI 正在思考中...</span>
                    </div>
                  ) : (
                    <MarkdownRenderer content={m.content} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-4 border-t bg-white/80 backdrop-blur-sm shadow-sm">
        <div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="跟AI聊点什么..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 backdrop-blur-sm"
              disabled={isLoading}
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors duration-200"
              disabled={!input.trim() || isLoading}
            > 
              {isLoading ? "发送中..." : "发送"}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
