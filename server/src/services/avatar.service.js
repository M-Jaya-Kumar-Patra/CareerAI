import { env } from '../config/env.js';

export function getAvatarCapabilities() {
  return {
    provider: env.AVATAR_PROVIDER || 'local',
    configured: Boolean(env.AVATAR_PROVIDER && env.AVATAR_API_KEY),
    realtime: Boolean(env.AVATAR_PROVIDER && env.AVATAR_API_KEY),
    supportedProviders: ['local', 'livekit', 'heygen', 'tavus'],
  };
}

export function createAvatarSession() {
  const capabilities = getAvatarCapabilities();
  if (!capabilities.configured) {
    const error = new Error('Realtime avatar provider is not configured');
    error.statusCode = 503;
    error.code = 'AVATAR_PROVIDER_UNAVAILABLE';
    throw error;
  }
  const error = new Error(`Avatar provider integration is not enabled for ${capabilities.provider}`);
  error.statusCode = 501;
  error.code = 'AVATAR_PROVIDER_NOT_IMPLEMENTED';
  throw error;
}
