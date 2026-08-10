import mongoose from 'mongoose';

const memorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, required: true, maxlength: 120 },
  content: { type: String, trim: true, required: true, maxlength: 5000 },
  category: { type: String, enum: ['goal', 'skill', 'preference', 'experience', 'learning', 'other'], default: 'other' },
  source: { type: String, enum: ['user', 'document', 'coach'], default: 'user' },
  embedding: { type: [Number], select: false, default: undefined },
}, { timestamps: true });

memorySchema.index({ userId: 1, updatedAt: -1 });
export const Memory = mongoose.model('Memory', memorySchema);
