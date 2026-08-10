import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, maxlength: 120, default: 'New conversation' },
  type: { type: String, enum: ['coach', 'interview', 'other'], default: 'coach' },
}, { timestamps: true });

conversationSchema.index({ userId: 1, updatedAt: -1 });
export const Conversation = mongoose.model('Conversation', conversationSchema);
