import mongoose from 'mongoose';

const turnSchema = new mongoose.Schema({
  role: { type: String, enum: ['interviewer', 'candidate'], required: true },
  content: { type: String, required: true, maxlength: 10000 },
}, { timestamps: true });

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, trim: true, maxlength: 160, default: 'Mock interview' },
  targetRole: { type: String, trim: true, maxlength: 160, required: true },
  interviewerId: { type: String, enum: ['maya', 'david', 'sofia'], default: 'maya' },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
  candidateContext: { type: String, maxlength: 16000, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
  turns: { type: [turnSchema], default: [] },
  evaluation: {
    score: { type: Number, min: 0, max: 100 },
    strengths: { type: [String], default: undefined },
    improvements: { type: [String], default: undefined },
    summary: { type: String, maxlength: 5000 },
    available: { type: Boolean, default: false },
  },
}, { timestamps: true });

interviewSchema.index({ userId: 1, updatedAt: -1 });
export const Interview = mongoose.model('Interview', interviewSchema);
