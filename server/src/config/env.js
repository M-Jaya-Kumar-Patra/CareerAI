import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../../../.env') });
dotenv.config({ path: path.resolve(currentDirectory, '../../.env'), override: false });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  SERVER_URL: z.string().url().default('http://localhost:5000'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  SESSION_SECRET: z.string().min(16).default('development-session-secret-change-me'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development-refresh-secret-change-me'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_COACH_MODEL: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_INTERVIEW_MODEL: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_EMBEDDING_MODEL: z.string().optional(),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_APP_NAME: z.string().default('CareerAI'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_RESUME_FOLDER: z.string().default('careerai/resumes'),
  AVATAR_PROVIDER: z.enum(['local', 'livekit', 'heygen', 'tavus']).default('local'),
  AVATAR_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
});

export const env = schema.parse(process.env);
