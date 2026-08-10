import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileName: { type: String, required: true, trim: true, maxlength: 255 },
  mimeType: { type: String, required: true, enum: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  fileSize: { type: Number, required: true, max: 10 * 1024 * 1024 },
  fileData: { type: Buffer, select: false, default: undefined },
  cloudinaryPublicId: { type: String, trim: true, default: null },
  cloudinaryResourceType: { type: String, enum: ['raw', 'image', 'video'], default: 'raw' },
  fileUrl: { type: String, trim: true, default: null },
  rawText: { type: String, default: '' },
  parsedData: { type: mongoose.Schema.Types.Mixed, default: null },
  processingStatus: { type: String, enum: ['ready', 'failed'], default: 'ready' },
  processingError: { type: String, default: null },
  atsScore: { type: Number, min: 0, max: 100, default: null },
  version: { type: Number, default: 1 },
}, { timestamps: true });

resumeSchema.index({ userId: 1, createdAt: -1 });
export const Resume = mongoose.model('Resume', resumeSchema);
