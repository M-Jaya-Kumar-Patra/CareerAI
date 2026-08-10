import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120 },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  avatar: { type: String, trim: true },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  authProviders: { type: [String], default: [] },
  currentRole: { type: String, trim: true, maxlength: 120 },
  targetRole: { type: String, trim: true, maxlength: 120 },
  experienceLevel: { type: String, enum: ['student', 'fresher', '0-1', '1-3', '3+'] },
  skills: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  preferredCompanies: { type: [String], default: [] },
  preferredLocations: { type: [String], default: [] },
  careerGoals: { type: String, trim: true, maxlength: 1000 },
  interviewExperience: { type: String, enum: ['none', 'some', 'confident'] },
  preferences: {
    interviewDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    responseStyle: { type: String, enum: ['concise', 'balanced', 'detailed'], default: 'balanced' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  },
  onboardingCompleted: { type: Boolean, default: false },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
