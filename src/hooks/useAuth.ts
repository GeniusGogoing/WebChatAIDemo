import { useCallback, useEffect, useState } from 'react';

export interface AuthUser { id: string; email: string; name?: string | null }

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登录失败');
    await refresh();
    return data;
  }, [refresh]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '注册失败');
    await refresh();
    return data;
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refresh();
  }, [refresh]);

  return { user, loading, error, refresh, login, register, logout };
}


