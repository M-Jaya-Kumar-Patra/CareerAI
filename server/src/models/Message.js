import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true, maxlength: 20000 },
  model: { type: String, default: null },
  tokens: { type: Number, default: null },
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });
export const Message = mongoose.model('Message', messageSchema);
