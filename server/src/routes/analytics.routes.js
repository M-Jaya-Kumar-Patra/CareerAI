import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Job } from '../models/Job.js';
import { Interview } from '../models/Interview.js';
import { Resume } from '../models/Resume.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.get('/progress', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [jobs, interviews, resumes] = await Promise.all([
      Job.find({ userId }).select('status createdAt updatedAt').lean(),
      Interview.find({ userId }).select('status evaluation.score createdAt updatedAt').lean(),
      Resume.find({ userId }).select('atsScore createdAt').sort({ createdAt: -1 }).lean(),
    ]);
    const statusOrder = ['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
    const funnel = statusOrder.map((status) => ({ status, count: jobs.filter((job) => job.status === status).length }));
    const scores = interviews.map((item) => item.evaluation?.score).filter((score) => Number.isFinite(score));
    const latestResume = resumes.find((resume) => Number.isFinite(resume.atsScore));
    const activity = Array.from({ length: 6 }, (_item, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const matches = (item) => { const created = new Date(item.createdAt); return created.getMonth() === date.getMonth() && created.getFullYear() === year; };
      return { month, applications: jobs.filter(matches).length, interviews: interviews.filter(matches).length };
    });
    res.json({ success: true, data: { overview: { applications: jobs.length, interviews: interviews.length, completedInterviews: interviews.filter((item) => item.status === 'completed').length, averageInterviewScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null, resumeScore: latestResume?.atsScore ?? null }, funnel, activity } });
  } catch (error) { next(error); }
});
