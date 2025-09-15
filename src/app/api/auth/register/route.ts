import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'email/password 必填' }, { status: 400 });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: '用户已存在' }, { status: 409 });
    const hash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, password: hash, name } });
    const token = await createToken({ sub: user.id, email: user.email });
    await setAuthCookie(token);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}


