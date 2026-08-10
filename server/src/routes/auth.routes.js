import { Router } from 'express';
import passport from 'passport';
import { clearAuthCookies, findOrCreateOAuthUser, revokeRefreshToken, rotateRefreshToken, setAuthCookies } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { User } from '../models/User.js';

export const authRouter = Router();
authRouter.get('/providers', (_req, res) => res.json({
  success: true,
  data: { google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) },
}));

authRouter.post('/dev-login', async (req, res, next) => {
  try {
    if (env.NODE_ENV !== 'development') {
      return res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
    }
    const input = z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(240).transform((value) => value.toLowerCase()),
    }).parse(req.body);
    const user = await User.findOneAndUpdate(
      { email: input.email },
      { $set: { name: input.name, email: input.email }, $addToSet: { authProviders: 'development' } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await setAuthCookies(res, user._id);
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});
function oauthCallback(provider) {
  return async (req, res, next) => {
    try {
      const user = await findOrCreateOAuthUser(req.user, provider);
      await setAuthCookies(res, user._id);
      res.redirect(`${env.CLIENT_URL}/dashboard`);
    } catch (error) {
      next(error);
    }
  };
}

authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], state: true, session: false }));
authRouter.get('/google/callback', passport.authenticate('google', { failureRedirect: `${env.CLIENT_URL}/login?error=oauth`, state: true, session: false }), oauthCallback('google'));
authRouter.get('/github', passport.authenticate('github', { scope: ['user:email'], state: true, session: false }));
authRouter.get('/github/callback', passport.authenticate('github', { failureRedirect: `${env.CLIENT_URL}/login?error=oauth`, state: true, session: false }), oauthCallback('github'));

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const user = await rotateRefreshToken(req, res);
    if (!user) return res.status(401).json({ success: false, message: 'Refresh token is invalid or expired', code: 'REFRESH_INVALID' });
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await revokeRefreshToken(req);
    clearAuthCookies(res);
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  currentRole: z.string().trim().max(120).optional().default(''),
  targetRole: z.string().trim().min(2).max(120),
  experienceLevel: z.enum(['student', 'fresher', '0-1', '1-3', '3+']),
  skills: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  languages: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  preferredCompanies: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  preferredLocations: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  careerGoals: z.string().trim().max(1000).default(''),
  interviewExperience: z.enum(['none', 'some', 'confident']),
  preferences: z.object({
    interviewDifficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    responseStyle: z.enum(['concise', 'balanced', 'detailed']).default('balanced'),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
  }).default({}),
});

authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = profileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { ...profile, onboardingCompleted: true } },
      { new: true, runValidators: true },
    ).select('-__v');
    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});
