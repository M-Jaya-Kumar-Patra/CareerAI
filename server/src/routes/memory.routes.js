import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { Memory } from '../models/Memory.js';
import { createEmbedding } from '../services/ai/embedding.service.js';

export const memoryRouter = Router();
memoryRouter.use(requireAuth);

const memorySchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(5000),
  category: z.enum(['goal', 'skill', 'preference', 'experience', 'learning', 'other']).default('other'),
});

memoryRouter.get('/', async (req, res, next) => {
  try {
    const memories = await Memory.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: { memories } });
  } catch (error) { next(error); }
});

memoryRouter.post('/', async (req, res, next) => {
  try {
    const input = memorySchema.parse(req.body);
    const embedding = await createEmbedding(`${input.title}\n${input.content}`);
    const memory = await Memory.create({ ...input, userId: req.user._id, embedding: embedding || undefined });
    res.status(201).json({ success: true, data: { memory: memory.toObject() } });
  } catch (error) { next(error); }
});

memoryRouter.delete('/:id', async (req, res, next) => {
  try {
    const memory = await Memory.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!memory) return res.status(404).json({ success: false, message: 'Memory not found', code: 'MEMORY_NOT_FOUND' });
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});
