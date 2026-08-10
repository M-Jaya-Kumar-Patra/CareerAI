import { DocumentChunk } from '../../models/DocumentChunk.js';
import { Job } from '../../models/Job.js';
import { Memory } from '../../models/Memory.js';
import { Resume } from '../../models/Resume.js';
import { createEmbedding, cosineSimilarity, lexicalScore } from './embedding.service.js';

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_OVERLAP = 180;

function normalizeSourceTypes(sourceTypes) {
  return sourceTypes?.length ? sourceTypes : ['resume', 'job', 'interview', 'memory'];
}

export function chunkText(text, { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = {}) {
  const normalized = String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current && `${current}\n\n${paragraph}`.length > chunkSize) {
      chunks.push(current);
      current = current.slice(Math.max(0, current.length - overlap));
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
    while (current.length > chunkSize * 1.4) {
      chunks.push(current.slice(0, chunkSize));
      current = current.slice(chunkSize - overlap);
    }
  }

  if (current) chunks.push(current);
  return chunks.map((content) => content.trim()).filter(Boolean);
}

async function safeEmbedding(input) {
  try {
    return await createEmbedding(input);
  } catch {
    return null;
  }
}

export async function indexDocumentChunks({ userId, sourceType, sourceId, title = '', text, metadata = {} }) {
  await DocumentChunk.deleteMany({ userId, sourceType, sourceId });
  const chunks = chunkText(text);
  if (!chunks.length) return [];

  const documents = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const content = chunks[index];
    const embedding = await safeEmbedding(`${title}\n${content}`);
    documents.push({
      userId,
      sourceType,
      sourceId,
      title,
      content,
      metadata: { ...metadata, chunkIndex: index, chunkCount: chunks.length },
      embedding: embedding || undefined,
    });
  }

  return DocumentChunk.insertMany(documents);
}

export async function removeDocumentChunks({ userId, sourceType, sourceId }) {
  return DocumentChunk.deleteMany({ userId, sourceType, sourceId });
}

export async function ensureUserRagIndex(userId) {
  const [resumes, jobs] = await Promise.all([
    Resume.find({ userId, processingStatus: 'ready' }).select('+rawText').lean(),
    Job.find({ userId }).lean(),
  ]);

  for (const resume of resumes) {
    const count = await DocumentChunk.countDocuments({ userId, sourceType: 'resume', sourceId: resume._id });
    if (!count && resume.rawText?.trim()) {
      await indexDocumentChunks({
        userId,
        sourceType: 'resume',
        sourceId: resume._id,
        title: resume.fileName,
        text: resume.rawText,
        metadata: { mimeType: resume.mimeType, fileName: resume.fileName },
      });
    }
  }

  for (const job of jobs) {
    const count = await DocumentChunk.countDocuments({ userId, sourceType: 'job', sourceId: job._id });
    const text = [job.description, job.notes].filter(Boolean).join('\n\n');
    if (!count && text.trim()) {
      await indexDocumentChunks({
        userId,
        sourceType: 'job',
        sourceId: job._id,
        title: `${job.company} - ${job.role}`,
        text,
        metadata: { company: job.company, role: job.role, status: job.status },
      });
    }
  }
}

export async function retrieveRagContext(userId, query, { limit = 8, sourceTypes } = {}) {
  const sources = normalizeSourceTypes(sourceTypes);
  const queryEmbedding = await safeEmbedding(query);
  const [chunks, memories] = await Promise.all([
    DocumentChunk.find({ userId, sourceType: { $in: sources.filter((source) => source !== 'memory') } }).select('+embedding').lean(),
    sources.includes('memory') ? Memory.find({ userId }).select('+embedding').lean() : [],
  ]);

  const chunkResults = chunks.map((chunk) => ({
    type: chunk.sourceType,
    title: chunk.title,
    content: chunk.content,
    metadata: chunk.metadata,
    score: queryEmbedding && chunk.embedding?.length
      ? cosineSimilarity(queryEmbedding, chunk.embedding)
      : lexicalScore(query, `${chunk.title} ${chunk.content}`),
  }));

  const memoryResults = memories.map((memory) => ({
    type: 'memory',
    title: memory.title,
    content: memory.content,
    metadata: { category: memory.category, source: memory.source },
    score: queryEmbedding && memory.embedding?.length
      ? cosineSimilarity(queryEmbedding, memory.embedding)
      : lexicalScore(query, `${memory.title} ${memory.content}`),
  }));

  return [...chunkResults, ...memoryResults]
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function formatRagContext(results) {
  if (!results?.length) return 'No relevant retrieved context found.';
  return results
    .map((item, index) => `[${index + 1}] ${item.type}${item.title ? ` - ${item.title}` : ''}\n${item.content}`)
    .join('\n\n');
}
