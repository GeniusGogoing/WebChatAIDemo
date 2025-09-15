import { NextResponse } from 'next/server';
import path from 'node:path';
import { loadProjectDocs, reindexKnowledgeBase } from '@/lib/rag';

export async function POST() {
  try {
    const projectRoot = path.join(process.cwd());
    const docs = await loadProjectDocs(projectRoot);
    if (docs.length === 0) {
      return NextResponse.json({ error: '未找到可索引文档' }, { status: 400 });
    }
    const res = await reindexKnowledgeBase('project-docs', docs);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}


