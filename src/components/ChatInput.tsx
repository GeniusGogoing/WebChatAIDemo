import React from 'react';
import type { ChatInputProps } from '../types';

export default function ChatInput({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={onInputChange}
        onKeyDown={handleKeyDown}
        placeholder="跟AI聊点什么... (Enter发送，Shift+Enter换行)"
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
  );
}
