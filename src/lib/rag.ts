import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from './prisma';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

export type KnowledgeChunk = {
  source: string;
  ord: number;
  content: string;
  embedding: number[];
};

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';

export async function getOrCreateKnowledgeBase(name: string) {
  const existing = await prisma.knowledgeBase.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.knowledgeBase.create({ data: { name } });
}

export function chunkText(content: string, chunkSize = 1200, overlap = 200): string[] {
  const clean = content.replace(/\r\n/g, '\n');
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + chunkSize);
    const piece = clean.slice(i, end);
    chunks.push(piece);
    if (end === clean.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}

export async function embedTexts(texts: string[], apiKey = process.env.GOOGLE_API_KEY): Promise<number[][]> {
  if (!apiKey) throw new Error('GOOGLE_API_KEY 未设置，无法生成嵌入');
  const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey, model: DEFAULT_EMBEDDING_MODEL });
  // LangChain Embeddings 类支持批量
  const vectors = await embeddings.embedDocuments(texts);
  return vectors;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function reindexKnowledgeBase(name: string, files: { path: string; content: string }[]) {
  const kb = await getOrCreateKnowledgeBase(name);
  // 清空旧 chunks
  await prisma.kbChunk.deleteMany({ where: { kbId: kb.id } });

  // 生成 chunks
  const allChunks: KnowledgeChunk[] = [];
  for (const file of files) {
    const parts = chunkText(file.content);
    parts.forEach((p, idx) => {
      allChunks.push({ source: file.path, ord: idx, content: p, embedding: [] });
    });
  }

  // 嵌入
  const vectors = await embedTexts(allChunks.map(c => c.content));
  const n = Math.min(allChunks.length, vectors.length);
  for (let i = 0; i < n; i++) {
    const vec = vectors[i] ?? [];
    const chunk = allChunks[i];
    if (!chunk) continue;
    chunk.embedding = Array.isArray(vec) ? (vec as number[]) : [];
  }

  // 批量写入
  // 分批以避免超长 SQL
  const batchSize = 100;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    await prisma.kbChunk.createMany({
      data: batch.map(c => ({
        kbId: kb.id,
        source: c.source,
        ord: c.ord,
        content: c.content,
        embedding: JSON.stringify(c.embedding),
      })),
    });
  }

  return { kbId: kb.id, chunkCount: allChunks.length };
}

export async function searchKnowledgeBase(name: string, query: string, k = 5) {
  const kb = await prisma.knowledgeBase.findUnique({ where: { name } });
  if (!kb) return [] as { source: string; ord: number; score: number; content: string }[];

  const embedded = await embedTexts([query]);
  const qVec = embedded[0];
  if (!Array.isArray(qVec)) return [] as { source: string; ord: number; score: number; content: string }[];
  const rows = await prisma.kbChunk.findMany({ where: { kbId: kb.id } });
  const scored = rows.map(r => {
    const parsed = JSON.parse(r.embedding || '[]');
    const vec: number[] = Array.isArray(parsed) ? parsed : [];
    const score = cosineSimilarity(qVec, vec);
    return { source: r.source, ord: r.ord, score, content: r.content };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export async function loadProjectDocs(rootDir: string) {
  const targets = [
    path.join(rootDir, 'README.md'),
    path.join(rootDir, 'Design', 'DESIGN.md'),
    path.join(rootDir, 'Design', 'CHANGELOG.md'),
    path.join(rootDir, 'Design', 'TODO.md'),
  ];
  const files: { path: string; content: string }[] = [];
  for (const p of targets) {
    try {
      const content = await fs.readFile(p, 'utf-8');
      files.push({ path: path.relative(rootDir, p), content });
    } catch {
      // ignore missing files
    }
  }
  return files;
}


