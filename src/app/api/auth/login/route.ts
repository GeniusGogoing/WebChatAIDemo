import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'email/password 必填' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    const ok = await verifyPassword(password, user.password);
    if (!ok) return NextResponse.json({ error: '密码错误' }, { status: 401 });
    const token = await createToken({ sub: user.id, email: user.email });
    await setAuthCookie(token);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}


