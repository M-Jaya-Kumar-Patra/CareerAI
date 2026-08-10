import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceType: { type: String, enum: ['resume', 'job', 'interview', 'memory'], required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: { type: String, trim: true, maxlength: 255, default: '' },
  content: { type: String, trim: true, required: true, maxlength: 4000 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  embedding: { type: [Number], select: false, default: undefined },
}, { timestamps: true });

documentChunkSchema.index({ userId: 1, sourceType: 1, sourceId: 1 });
documentChunkSchema.index({ userId: 1, updatedAt: -1 });

export const DocumentChunk = mongoose.model('DocumentChunk', documentChunkSchema);
