"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(email, password, name);
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white/80 backdrop-blur-sm border rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold text-sky-600">注册</h1>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <input className="w-full border rounded px-3 py-2" placeholder="姓名（可选）" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded px-3 py-2 disabled:bg-blue-300">
          {loading ? '注册中...' : '注册'}
        </button>
        <div className="text-sm text-gray-600">
          已有账号？<Link href="/login" className="text-blue-600 hover:underline">去登录</Link>
        </div>
      </form>
    </div>
  );
}


