import mongoose from 'mongoose';
import { env } from './config/env.js';

function describeMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    const database = parsed.pathname?.replace('/', '') || '(default)';
    return `${parsed.protocol}//${parsed.host}/${database}`;
  } catch {
    return 'configured MongoDB URI';
  }
}

export async function connectDatabase() {
  await mongoose.connect(env.MONGO_URI);
  console.log(`CareerAI database connected: ${describeMongoUri(env.MONGO_URI)}`);
}
