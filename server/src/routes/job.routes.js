import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { Job } from '../models/Job.js';
import { createJobAnalysis } from '../services/ai/openrouter.service.js';
import { ensureUserRagIndex, formatRagContext, indexDocumentChunks, removeDocumentChunks, retrieveRagContext } from '../services/ai/rag.service.js';

const statuses = ['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
const jobSchema = z.object({
  company: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(160),
  jobUrl: z.string().url().max(2000).or(z.literal('')).optional().default(''),
  description: z.string().max(50000).optional().default(''),
  salary: z.string().max(120).optional().default(''),
  notes: z.string().max(5000).optional().default(''),
  status: z.enum(statuses).default('Applied'),
  applicationDate: z.coerce.date().nullable().optional(),
  interviewDate: z.coerce.date().nullable().optional(),
});

export const jobRouter = Router();
jobRouter.use(requireAuth);

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function indexJob(job) {
  const text = [job.description, job.notes].filter(Boolean).join('\n\n');
  if (!text.trim()) {
    await removeDocumentChunks({ userId: job.userId, sourceType: 'job', sourceId: job._id });
    return;
  }
  await indexDocumentChunks({
    userId: job.userId,
    sourceType: 'job',
    sourceId: job._id,
    title: `${job.company} - ${job.role}`,
    text,
    metadata: { company: job.company, role: job.role, status: job.status },
  });
}

async function parseJobAnalysis(payload) {
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) {
    const error = new Error('The job analysis AI returned an empty response');
    error.statusCode = 502;
    error.code = 'AI_INVALID_RESPONSE';
    throw error;
  }
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const parseError = new Error('The job analysis AI returned invalid data');
    parseError.statusCode = 502;
    parseError.code = 'AI_INVALID_RESPONSE';
    throw parseError;
  }
}

jobRouter.get('/', async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.status && statuses.includes(req.query.status)) filter.status = req.query.status;
    const jobs = await Job.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: { jobs } });
  } catch (error) { next(error); }
});

jobRouter.post('/', async (req, res, next) => {
  try {
    const input = jobSchema.parse(req.body);
    const job = await Job.create({ ...input, userId: req.user._id });
    await indexJob(job);
    res.status(201).json({ success: true, data: { job } });
  } catch (error) { next(error); }
});

jobRouter.get('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    const job = await Job.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    res.json({ success: true, data: { job } });
  } catch (error) { next(error); }
});

jobRouter.put('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    const input = jobSchema.partial().parse(req.body);
    const job = await Job.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: input }, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    await indexJob(job);
    res.json({ success: true, data: { job } });
  } catch (error) { next(error); }
});

jobRouter.delete('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    const result = await Job.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    await removeDocumentChunks({ userId: req.user._id, sourceType: 'job', sourceId: req.params.id });
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});

jobRouter.post('/analyze', async (req, res, next) => {
  try {
    const input = z.object({ company: z.string().trim().max(160).optional(), role: z.string().trim().max(160).optional(), description: z.string().trim().min(30).max(50000) }).parse(req.body);
    await ensureUserRagIndex(req.user._id);
    const retrievedContext = await retrieveRagContext(req.user._id, `${input.role || ''}\n${input.description}`, { sourceTypes: ['resume', 'memory', 'interview'], limit: 10 });
    const payload = await createJobAnalysis([
      { role: 'system', content: 'You are a career analyst. Use retrieved context as candidate evidence. Return JSON only with summary, extractedSkills (array), responsibilities (array), keywords (array), and resumeMatch (0-100 or null). Compare against retrieved resume/memory/interview evidence when available. Do not invent requirements or candidate experience.' },
      { role: 'user', content: JSON.stringify({ company: input.company, role: input.role, description: input.description, retrievedContext: formatRagContext(retrievedContext) }) },
    ]);
    const analysis = await parseJobAnalysis(payload);
    res.json({ success: true, data: { analysis } });
  } catch (error) { next(error); }
});

jobRouter.post('/:id/match', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    const job = await Job.findOne({ _id: req.params.id, userId: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found', code: 'JOB_NOT_FOUND' });
    if (!job.description?.trim()) return res.status(400).json({ success: false, message: 'Add a job description before matching.', code: 'JOB_DESCRIPTION_REQUIRED' });
    await ensureUserRagIndex(req.user._id);
    const retrievedContext = await retrieveRagContext(req.user._id, `${job.role}\n${job.description}`, { sourceTypes: ['resume', 'memory', 'interview'], limit: 10 });
    const payload = await createJobAnalysis([
      { role: 'system', content: 'You are a career analyst matching a candidate to a job. Use retrieved context as candidate evidence. Return JSON only with summary, extractedSkills (array), responsibilities (array), keywords (array), and resumeMatch (0-100 or null). Do not invent candidate experience.' },
      { role: 'user', content: JSON.stringify({ company: job.company, role: job.role, description: job.description, retrievedContext: formatRagContext(retrievedContext) }) },
    ]);
    const analysis = await parseJobAnalysis(payload);
    job.extractedSkills = analysis.extractedSkills || [];
    job.responsibilities = analysis.responsibilities || [];
    job.keywords = analysis.keywords || [];
    job.matchScore = analysis.resumeMatch == null ? null : Math.max(0, Math.min(100, Number(analysis.resumeMatch) || 0));
    await job.save();
    await indexJob(job);
    res.json({ success: true, data: { job, analysis } });
  } catch (error) { next(error); }
});
