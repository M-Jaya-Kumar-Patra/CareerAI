import { Router } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { clearAuthCookies, findOrCreateOAuthUser, revokeRefreshToken, rotateRefreshToken, setAuthCookies } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { sendAuthEmail } from '../services/email.service.js';

const UNVERIFIED_ACCOUNT_TTL_MS = 15 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function createOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function cleanupUnverifiedUsers() {
  const cutoff = new Date(Date.now() - UNVERIFIED_ACCOUNT_TTL_MS);
  return User.deleteMany({ emailVerified: false, createdAt: { $lt: cutoff } });
}

async function saveOtp(user, purpose) {
  const otp = createOtpCode();
  user.otpCode = otp;
  user.otpPurpose = purpose;
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  await user.save();
  return otp;
}

async function clearOtp(user) {
  user.otpCode = undefined;
  user.otpPurpose = undefined;
  user.otpExpiresAt = undefined;
  await user.save();
}

function buildAuthMessage({ emailResult, otp, fallbackMessage }) {
  if (env.NODE_ENV === 'development' && emailResult?.skipped) {
    return { message: fallbackMessage, otp };
  }
  return { message: fallbackMessage };
}

export const authRouter = Router();
authRouter.get('/providers', (_req, res) => res.json({
  success: true,
  data: { google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) },
}));

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

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(240).transform(normalizeEmail),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(240).transform(normalizeEmail),
  password: z.string().min(1).max(200),
});

const verifySchema = z.object({
  email: z.string().trim().email().max(240).transform(normalizeEmail),
  otp: z.string().trim().regex(/^\d{6}$/),
});

const resendSchema = z.object({
  email: z.string().trim().email().max(240).transform(normalizeEmail),
  purpose: z.enum(['signup', 'password-reset']).default('signup'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(240).transform(normalizeEmail),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(240).transform(normalizeEmail),
  otp: z.string().trim().regex(/^\d{6}$/),
  password: z.string().min(8).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    await cleanupUnverifiedUsers();
    const input = registerSchema.parse(req.body);
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(409).json({ success: false, message: 'An account with that email already exists.', code: 'EMAIL_ALREADY_EXISTS' });
      }
      await existingUser.deleteOne();
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      emailVerified: false,
      onboardingCompleted: false,
      authProviders: [],
    });
    const otp = await saveOtp(user, 'signup');
    const emailResult = await sendAuthEmail({
      to: input.email,
      subject: 'Verify your CareerAI account',
      headline: 'One more step to unlock your workspace',
      body: 'Use the code below to verify your email and start using CareerAI.',
      footerText: `Verification code: ${otp}`,
    });
    const payload = buildAuthMessage({ emailResult, otp, fallbackMessage: 'We’ve prepared your account. Check the console for the verification code in development mode.' });
    res.json({ success: true, data: { user: { _id: user._id, email: user.email, name: user.name }, ...payload } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    await cleanupUnverifiedUsers();
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash || ''))) {
      return res.status(401).json({ success: false, message: 'The email or password you entered is incorrect.', code: 'INVALID_CREDENTIALS' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ success: false, message: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' });
    }
    await setAuthCookies(res, user._id);
    const safeUser = await User.findById(user._id).select('-__v');
    res.json({ success: true, data: { user: safeUser } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const input = verifySchema.parse(req.body);
    const user = await User.findOne({ email: input.email }).select('+otpCode +otpPurpose +otpExpiresAt +passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'No account was found for that email.', code: 'USER_NOT_FOUND' });
    if (user.emailVerified) return res.json({ success: true, data: { user: await User.findById(user._id).select('-__v') } });
    if (!user.otpCode || user.otpPurpose !== 'signup' || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) {
      return res.status(400).json({ success: false, message: 'The verification code has expired. Please request a new one.', code: 'OTP_EXPIRED' });
    }
    if (user.otpCode !== input.otp) {
      return res.status(400).json({ success: false, message: 'The verification code is incorrect.', code: 'OTP_INVALID' });
    }
    user.emailVerified = true;
    await clearOtp(user);
    await setAuthCookies(res, user._id);
    const safeUser = await User.findById(user._id).select('-__v');
    res.json({ success: true, data: { user: safeUser } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/resend-otp', async (req, res, next) => {
  try {
    const input = resendSchema.parse(req.body);
    await cleanupUnverifiedUsers();
    const user = await User.findOne({ email: input.email });
    if (!user) {
      return res.json({ success: true, data: { message: 'If an account exists for that email, we will resend the code shortly.' } });
    }
    if (input.purpose === 'signup' && user.emailVerified) {
      return res.status(400).json({ success: false, message: 'This email is already verified.', code: 'EMAIL_ALREADY_VERIFIED' });
    }
    const otp = await saveOtp(user, input.purpose);
    const emailResult = await sendAuthEmail({
      to: input.email,
      subject: input.purpose === 'password-reset' ? 'Reset your CareerAI password' : 'Verify your CareerAI account',
      headline: input.purpose === 'password-reset' ? 'Reset your password securely' : 'Verify your email inbox',
      body: input.purpose === 'password-reset' ? 'Use the code below to continue resetting your password.' : 'Use the code below to verify your account and continue.',
      footerText: `Code: ${otp}`,
    });
    const payload = buildAuthMessage({ emailResult, otp, fallbackMessage: 'We’ve re-sent the code. Check the console for the verification code in development mode.' });
    res.json({ success: true, data: { message: payload.message, ...payload } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ email: input.email });
    if (!user) {
      return res.json({ success: true, data: { message: 'If an account exists for that email, we will send a reset code shortly.' } });
    }
    const otp = await saveOtp(user, 'password-reset');
    const emailResult = await sendAuthEmail({
      to: input.email,
      subject: 'Reset your CareerAI password',
      headline: 'Reset your password securely',
      body: 'Use the code below to continue resetting your password.',
      footerText: `Reset code: ${otp}`,
    });
    const payload = buildAuthMessage({ emailResult, otp, fallbackMessage: 'We’ve issued a reset code. Check the console for the code in development mode.' });
    res.json({ success: true, data: { message: payload.message, ...payload } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const user = await User.findOne({ email: input.email }).select('+otpCode +otpPurpose +otpExpiresAt +passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'No account was found for that email.', code: 'USER_NOT_FOUND' });
    if (!user.otpCode || user.otpPurpose !== 'password-reset' || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) {
      return res.status(400).json({ success: false, message: 'The reset code has expired. Please request a new one.', code: 'OTP_EXPIRED' });
    }
    if (user.otpCode !== input.otp) {
      return res.status(400).json({ success: false, message: 'The reset code is incorrect.', code: 'OTP_INVALID' });
    }
    user.passwordHash = await bcrypt.hash(input.password, 12);
    user.emailVerified = true;
    await clearOtp(user);
    await setAuthCookies(res, user._id);
    const safeUser = await User.findById(user._id).select('-__v');
    res.json({ success: true, data: { user: safeUser } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user._id).select('+passwordHash');
    const matches = await bcrypt.compare(input.currentPassword, user.passwordHash || '');
    if (!matches) return res.status(400).json({ success: false, message: 'Your current password is incorrect.', code: 'INVALID_CURRENT_PASSWORD' });
    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    await user.save();
    res.json({ success: true, data: { user: await User.findById(user._id).select('-__v') } });
  } catch (error) {
    next(error);
  }
});

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

authRouter.delete('/me', requireAuth, async (req, res, next) => {
  try {
    await RefreshToken.deleteMany({ userId: req.user._id });
    await req.user.deleteOne();
    clearAuthCookies(res);
    res.json({ success: true, data: null });
  } catch (error) { next(error); }
});

authRouter.get('/me', requireAuth, async (req, res) => {
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
