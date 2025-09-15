"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';

type SessionSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
};

interface SessionsSidebarProps {
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export default function SessionsSidebar({ activeId, onSelect, onNewChat }: SessionsSidebarProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 可调整宽度
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 480;
  const DEFAULT_WIDTH = 256; // 原先的 w-64
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH;
    const saved = window.localStorage.getItem('sessionsSidebarWidth');
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed)) : DEFAULT_WIDTH;
  });
  const dragState = useRef<{ dragging: boolean; startX: number; startWidth: number }>({ dragging: false, startX: 0, startWidth: width });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chats');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
    } catch (e) {
      console.error('获取会话列表失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sessionsSidebarWidth', String(width));
  }, [width]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.current.dragging) return;
    const delta = e.clientX - dragState.current.startX;
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragState.current.startWidth + delta));
    setWidth(next);
  }, []);

  const stopDragging = useCallback(() => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove as any);
    window.removeEventListener('mouseup', stopDragging as any);
  }, [onMouseMove]);

  const startDragging = useCallback((e: React.MouseEvent) => {
    dragState.current = { dragging: true, startX: e.clientX, startWidth: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove as any);
    window.addEventListener('mouseup', stopDragging as any);
  }, [width, onMouseMove, stopDragging]);

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该会话？该操作不可恢复。')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chats?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除会话失败');
      await fetchSessions();
    } catch (e) {
      console.error('删除会话失败:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="border-r bg-white/70 backdrop-blur-sm h-screen flex flex-col relative" style={{ width }}>
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm text-gray-700 font-medium">会话</span>
        <button
          onClick={onNewChat}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          新建
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 text-xs text-gray-500">加载中...</div>
        ) : sessions.length === 0 ? (
          <div className="p-3 text-xs text-gray-400">暂无会话</div>
        ) : (
          <ul className="py-2">
            {sessions.map(s => (
              <li key={s.id} className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-gray-100 ${activeId === s.id ? 'bg-blue-50' : ''}`}>
                <button
                  onClick={() => onSelect(s.id)}
                  className="flex-1 text-left"
                  title={s.title || '未命名会话'}
                >
                  <div className="text-sm text-gray-800 truncate">{s.title || '未命名会话'}</div>
                  <div className="text-[10px] text-gray-400">{new Date(s.updatedAt).toLocaleString()}</div>
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs text-red-500 hover:text-red-600 disabled:text-red-300"
                  disabled={deletingId === s.id}
                  title="删除会话"
                >
                  {deletingId === s.id ? '…' : '删'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* 拖拽手柄 */}
      <div
        onMouseDown={startDragging}
        className="absolute top-0 -right-[3px] h-full w-[6px] cursor-col-resize"
        style={{
          // 提高命中区域并保留视觉细线
          background: 'transparent',
        }}
      >
        <div className="absolute right-[3px] top-0 h-full w-px bg-gray-200" />
      </div>
    </aside>
  );
}


