import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireUser();
    const where = user ? { userId: user.id } : { id: undefined as any }; // 未登录返回空
    const sessions = await prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json(sessions);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // 级联删除由 Prisma schema onDelete: Cascade 保证
    const user = await requireUser();
    const chat = await prisma.chatSession.findUnique({ where: { id } });
    if (!chat) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (user && chat.userId && chat.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    await prisma.chatSession.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}