import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import type { MessageBubbleProps } from '../types';
import { THINKING_CONTENT } from '../types';

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isThinking = message.content === THINKING_CONTENT || message.content.startsWith('AI 正在思考中');

  return (
    <div className="flex items-start space-x-3">
      {/* 头像/标识 */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
        isUser 
          ? "bg-blue-500 text-white" 
          : "bg-gray-300 text-gray-700"
      }`}>
        {isUser ? "你" : "AI"}
      </div>
      
      {/* 消息内容 */}
      <div className="flex-1 min-w-0">
        <div className={`inline-block px-4 py-3 rounded-lg ${
          isUser 
            ? "bg-blue-500 text-white" 
            : "bg-gray-100 text-gray-800 border border-gray-200"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : isThinking ? (
            <div className="inline-flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <span className="text-sm text-gray-600">AI 正在思考中...</span>
            </div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}
