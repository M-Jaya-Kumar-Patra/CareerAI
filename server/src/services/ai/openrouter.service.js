import { env } from '../../config/env.js';

export function isOpenRouterConfigured() {
  return Boolean(env.OPENROUTER_API_KEY);
}

function headers() {
  return {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    ...(env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': env.OPENROUTER_SITE_URL } : {}),
    'X-Title': env.OPENROUTER_APP_NAME,
  };
}

export async function createCoachCompletion(messages, { stream = false } = {}) {
  if (!isOpenRouterConfigured()) {
    const error = new Error('AI service is not configured');
    error.statusCode = 503;
    error.code = 'AI_SERVICE_UNAVAILABLE';
    throw error;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: env.OPENROUTER_COACH_MODEL, messages, stream, max_tokens: 1200, temperature: 0.4 }),
  });
  if (!response.ok) {
    const error = new Error('AI service temporarily unavailable');
    error.statusCode = response.status === 429 ? 429 : 502;
    error.code = response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR';
    throw error;
  }
  return response;
}

export async function createInterviewCompletion(messages) {
  if (!isOpenRouterConfigured()) {
    const error = new Error('Configure OPENROUTER_API_KEY before starting an AI interview');
    error.statusCode = 503;
    error.code = 'AI_SERVICE_UNAVAILABLE';
    throw error;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: env.OPENROUTER_INTERVIEW_MODEL, messages, max_tokens: 800, temperature: 0.5 }),
  });
  if (!response.ok) {
    const error = new Error('AI interview service temporarily unavailable');
    error.statusCode = response.status === 429 ? 429 : 502;
    error.code = response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR';
    throw error;
  }
  return response.json();
}

export async function createResumeAnalysis(messages) {
  if (!isOpenRouterConfigured()) {
    const error = new Error('Configure OPENROUTER_API_KEY before analyzing a resume');
    error.statusCode = 503;
    error.code = 'AI_SERVICE_UNAVAILABLE';
    throw error;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: env.OPENROUTER_COACH_MODEL, messages, max_tokens: 1400, temperature: 0.2 }),
  });
  if (!response.ok) {
    const error = new Error('AI resume analysis service temporarily unavailable');
    error.statusCode = response.status === 429 ? 429 : 502;
    error.code = response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR';
    throw error;
  }
  return response.json();
}

export async function createJobAnalysis(messages) {
  if (!isOpenRouterConfigured()) {
    const error = new Error('Configure OPENROUTER_API_KEY before analyzing a job description');
    error.statusCode = 503;
    error.code = 'AI_SERVICE_UNAVAILABLE';
    throw error;
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: env.OPENROUTER_COACH_MODEL, messages, max_tokens: 1000, temperature: 0.2 }),
  });
  if (!response.ok) {
    const error = new Error('AI job analysis service temporarily unavailable');
    error.statusCode = response.status === 429 ? 429 : 502;
    error.code = response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR';
    throw error;
  }
  return response.json();
}
