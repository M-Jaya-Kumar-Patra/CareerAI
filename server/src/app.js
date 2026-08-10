import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { configurePassport } from './config/passport.js';
import { resumeRouter } from './routes/resume.routes.js';
import { jobRouter } from './routes/job.routes.js';
import { coachRouter } from './routes/coach.routes.js';
import { memoryRouter } from './routes/memory.routes.js';
import { interviewRouter } from './routes/interview.routes.js';
import { avatarRouter } from './routes/avatar.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import pingNest from "pingnest";


export const app = express();
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(session({ secret: env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 10 * 60 * 1000 } }));
configurePassport();
app.use(passport.initialize());

app.use(
  pingNest({
    apiKey: env.PINGNEST_API_KEY,
    service: env.PINGNEST_SERVICE,
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { service: 'careerai-api', status: 'ok' } });
}); 
app.use('/api/auth', authRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/coach', coachRouter);
app.use('/api/memories', memoryRouter);
app.use('/api/interviews', interviewRouter);
app.use('/api/avatar', avatarRouter);
app.use('/api/analytics', analyticsRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', code: 'NOT_FOUND' });
});

app.use((error, _req, res, _next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Resume files must be 10 MB or smaller', code: 'RESUME_FILE_TOO_LARGE' });
  }
  if (error?.name === 'MulterError') {
    return res.status(400).json({ success: false, message: 'Unable to read the uploaded file', code: 'RESUME_UPLOAD_INVALID' });
  }
  if (error?.statusCode && error?.code) {
    return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code });
  }
  if (error?.name === 'ZodError') {
    return res.status(400).json({ success: false, message: 'Please check the submitted fields', code: 'VALIDATION_ERROR', details: error.issues.map((issue) => ({ path: issue.path, message: issue.message })) });
  }
  console.error(error);
  res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' });
});
