import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true, trim: true, maxlength: 160 },
  role: { type: String, required: true, trim: true, maxlength: 160 },
  jobUrl: { type: String, trim: true, maxlength: 2000 },
  description: { type: String, trim: true, maxlength: 50000, default: '' },
  extractedSkills: { type: [String], default: [] },
  responsibilities: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  matchScore: { type: Number, min: 0, max: 100, default: null },
  status: { type: String, enum: ['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'], default: 'Applied', index: true },
  applicationDate: { type: Date, default: null },
  interviewDate: { type: Date, default: null },
  salary: { type: String, trim: true, maxlength: 120 },
  notes: { type: String, trim: true, maxlength: 5000 },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
}, { timestamps: true });

jobSchema.index({ userId: 1, updatedAt: -1 });
export const Job = mongoose.model('Job', jobSchema);
