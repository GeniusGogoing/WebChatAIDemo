import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractWithZodSchema, getBuiltinSchema } from '@/lib/structured';

const RequestSchema = z.object({
  text: z.string().min(1),
  schema: z.union([z.literal('contact'), z.literal('task')]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { text, schema: builtin } = RequestSchema.parse(json);
    const schema = getBuiltinSchema(builtin || 'contact');
    if (!schema) return NextResponse.json({ error: 'unsupported schema' }, { status: 400 });
    const data = await extractWithZodSchema(text, schema);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}


