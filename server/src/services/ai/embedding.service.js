import { env } from '../../config/env.js';
import { Memory } from '../../models/Memory.js';

function headers() {
  return {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    ...(env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': env.OPENROUTER_SITE_URL } : {}),
    'X-Title': env.OPENROUTER_APP_NAME,
  };
}

export function isEmbeddingConfigured() {
  return Boolean(env.OPENROUTER_API_KEY && env.OPENROUTER_EMBEDDING_MODEL);
}

export async function createEmbedding(input) {
  if (!isEmbeddingConfigured()) return null;
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: env.OPENROUTER_EMBEDDING_MODEL, input }),
  });
  if (!response.ok) {
    const error = new Error('Embedding service temporarily unavailable');
    error.statusCode = response.status === 429 ? 429 : 502;
    error.code = response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR';
    throw error;
  }
  const payload = await response.json();
  return payload.data?.[0]?.embedding || null;
}

export function cosineSimilarity(left, right) {
  if (!left?.length || left.length !== right?.length) return 0;
  let dot = 0; let leftMagnitude = 0; let rightMagnitude = 0;
  left.forEach((value, index) => {
    dot += value * right[index];
    leftMagnitude += value ** 2;
    rightMagnitude += right[index] ** 2;
  });
  return leftMagnitude && rightMagnitude ? dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude)) : 0;
}

export function lexicalScore(query, content) {
  const terms = query.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
  if (!terms.length) return 0;
  const text = content.toLowerCase();
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0) / terms.length;
}

export async function retrieveMemories(userId, query, limit = 5) {
  const memories = await Memory.find({ userId }).select('+embedding').lean();
  const queryEmbedding = await createEmbedding(query);
  return memories
    .map((memory) => ({
      ...memory,
      score: queryEmbedding && memory.embedding?.length
        ? cosineSimilarity(queryEmbedding, memory.embedding)
        : lexicalScore(query, `${memory.title} ${memory.content}`),
    }))
    .filter((memory) => memory.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
