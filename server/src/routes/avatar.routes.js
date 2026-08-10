import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createAvatarSession, getAvatarCapabilities } from '../services/avatar.service.js';

export const avatarRouter = Router();
avatarRouter.use(requireAuth);

avatarRouter.get('/capabilities', (_req, res) => {
  res.json({ success: true, data: getAvatarCapabilities() });
});

avatarRouter.post('/sessions', (_req, res, next) => {
  try {
    const session = createAvatarSession();
    res.status(201).json({ success: true, data: { session } });
  } catch (error) { next(error); }
});
