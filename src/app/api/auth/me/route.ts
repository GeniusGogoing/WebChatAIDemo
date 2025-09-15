import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}


