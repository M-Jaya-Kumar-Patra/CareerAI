import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { get } from 'node:https';
import { requireAuth } from '../middleware/auth.js';
import { Resume } from '../models/Resume.js';
import { basicResumeMetadata, extractResumeText, normalizeResumeText, validateResumeFile } from '../services/resume.service.js';
import { createResumeAnalysis } from '../services/ai/openrouter.service.js';
import { ensureUserRagIndex, formatRagContext, indexDocumentChunks, removeDocumentChunks, retrieveRagContext } from '../services/ai/rag.service.js';
import { deleteResumeFile, resumeFileUrl, uploadResumeFile } from '../services/cloudinary.service.js';
import { z } from 'zod';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const resumeRouter = Router();
resumeRouter.use(requireAuth);

function validResumeId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function pipeRemoteFile(url, res, resume, download) {
  get(url, (remote) => {
    if (remote.statusCode >= 300 && remote.statusCode < 400 && remote.headers.location) {
      pipeRemoteFile(remote.headers.location, res, resume, download);
      return;
    }
    if (remote.statusCode !== 200) {
      res.status(502).json({ success: false, message: 'Unable to load resume preview', code: 'RESUME_FILE_PROXY_FAILED' });
      remote.resume();
      return;
    }
    const disposition = download ? 'attachment' : 'inline';
    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(resume.fileName)}"`);
    if (remote.headers['content-length']) res.setHeader('Content-Length', remote.headers['content-length']);
    remote.pipe(res);
  }).on('error', (error) => {
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Unable to load resume preview', code: 'RESUME_FILE_PROXY_FAILED' });
    } else {
      res.destroy(error);
    }
  });
}

resumeRouter.post('/', upload.single('resume'), async (req, res, next) => {
  try {
    validateResumeFile(req.file);
    const rawText = normalizeResumeText(await extractResumeText(req.file));
    if (!rawText) return res.status(422).json({ success: false, message: 'We could not extract readable text from this document', code: 'RESUME_TEXT_EMPTY' });
    const uploadedFile = await uploadResumeFile(req.file, { userId: req.user._id });
    const resume = await Resume.create({
      userId: req.user._id,
      fileName: req.file.originalname.replace(/[^\w.\- ()]/g, '_'),
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      cloudinaryPublicId: uploadedFile.public_id,
      cloudinaryResourceType: uploadedFile.resource_type || 'raw',
      fileUrl: uploadedFile.secure_url,
      rawText,
      parsedData: basicResumeMetadata(rawText),
    });
    await indexDocumentChunks({
      userId: req.user._id,
      sourceType: 'resume',
      sourceId: resume._id,
      title: resume.fileName,
      text: rawText,
      metadata: { mimeType: resume.mimeType, fileName: resume.fileName },
    });
    res.status(201).json({ success: true, data: { resume: resume.toObject({ transform: (_doc, ret) => { delete ret.rawText; return ret; } }) } });
  } catch (error) {
    next(error);
  }
});

resumeRouter.get('/', async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id }).select('-rawText -processingError').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { resumes } });
  } catch (error) { next(error); }
});

resumeRouter.get('/:id', async (req, res, next) => {
  try {
    if (!validResumeId(req.params.id)) return res.status(404).json({ success: false, message: 'Resume not found', code: 'RESUME_NOT_FOUND' });
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id }).select('-processingError');
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found', code: 'RESUME_NOT_FOUND' });
    res.json({ success: true, data: { resume } });
  } catch (error) { next(error); }
});

resumeRouter.get('/:id/file', async (req, res, next) => {
  try {
    if (!validResumeId(req.params.id)) return res.status(404).json({ success: false, message: 'Resume not found', code: 'RESUME_NOT_FOUND' });
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id }).select('+fileData').lean();
    if (!resume) return res.status(404).json({ success: false, message: 'Resume file not found', code: 'RESUME_FILE_NOT_FOUND' });
    if (resume.cloudinaryPublicId) return pipeRemoteFile(resumeFileUrl(resume.cloudinaryPublicId, { download: req.query.download === '1' }), res, resume, req.query.download === '1');
    if (!resume.fileData) return res.status(404).json({ success: false, message: 'Resume file not found', code: 'RESUME_FILE_NOT_FOUND' });
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', resume.mimeType);
    res.setHeader('Content-Length', resume.fileSize);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(resume.fileName)}"`);
    res.send(resume.fileData);
  } catch (error) { next(error); }
});

resumeRouter.delete('/:id', async (req, res, next) => {
  try {
    if (!validResumeId(req.params.id)) return res.status(404).json({ success: false, message: 'Resume not found', code: 'RESUME_NOT_FOUND' });
    const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found', code: 'RESUME_NOT_FOUND' });
    await deleteResumeFile(resume.cloudinaryPublicId);
    await removeDocumentChunks({ userId: req.user._id, sourceType: 'resume', sourceId: req.params.id });
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});

resumeRouter.post('/:id/analyze', async (req, res, next) => {
  try {
    if (!validResumeId(req.params.id)) return res.status(404).json({ success: false, message: 'Resume not found', code: 'RESUME_NOT_FOUND' });
    const input = z.object({ targetRole: z.string().trim().max(160).optional() }).parse(req.body || {});
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id }).select('+rawText');
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found', code: 'RESUME_NOT_FOUND' });
    const targetRole = input.targetRole || req.user.targetRole || 'General professional role';
    await ensureUserRagIndex(req.user._id);
    const context = await retrieveRagContext(req.user._id, `${targetRole}\nresume ATS analysis`, { sourceTypes: ['resume', 'memory'], limit: 10 });
    const payload = await createResumeAnalysis([
      { role: 'system', content: 'You are an expert ATS resume reviewer. Use the retrieved context as source material and do not invent facts. Return JSON only with score (0-100), summary, strengths (array of 3 strings), improvements (array of 4 strings), missingKeywords (array of strings), and sectionFeedback (array of objects with section and feedback).' },
      { role: 'user', content: JSON.stringify({ targetRole, retrievedContext: formatRagContext(context), resumeFallback: resume.rawText.slice(0, 4000) }) },
    ]);
    const raw = payload?.choices?.[0]?.message?.content;
    if (!raw) {
      const error = new Error('The resume AI returned an empty analysis');
      error.statusCode = 502;
      error.code = 'AI_INVALID_RESPONSE';
      throw error;
    }
    let analysis;
    try {
      analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      const parseError = new Error('The resume AI returned an invalid analysis');
      parseError.statusCode = 502;
      parseError.code = 'AI_INVALID_RESPONSE';
      throw parseError;
    }
    resume.atsScore = Math.max(0, Math.min(100, Number(analysis.score) || 0));
    resume.parsedData = { ...resume.parsedData, aiAnalysis: analysis };
    await resume.save();
    res.json({ success: true, data: { resume: resume.toObject({ transform: (_doc, ret) => { delete ret.rawText; return ret; } }), analysis } });
  } catch (error) { next(error); }
});

resumeRouter.post('/:id/improve', (_req, res) => {
  res.status(501).json({ success: false, message: 'AI resume improvement will be enabled when the AI service is configured', code: 'AI_IMPROVEMENT_NOT_CONFIGURED' });
});
