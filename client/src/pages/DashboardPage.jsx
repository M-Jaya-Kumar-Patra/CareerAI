import { ArrowUpRight, BriefcaseBusiness, FileText, MessageCircle, Play, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

function formatActivityDate(value) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function getApiPayload(response) {
  return response?.data?.data ?? response?.data ?? {};
}

function getArrayPayload(payload, key) {
  const value = payload?.[key];
  return Array.isArray(value) ? value : [];
}

function buildOverview(jobs, interviews, resumes) {
  const completedInterviews = interviews.filter((item) => item.status === 'completed').length;
  const interviewScores = interviews.map((item) => item.evaluation?.score).filter((score) => Number.isFinite(score));
  const latestResume = [...resumes].find((resume) => Number.isFinite(resume.atsScore));

  return {
    applications: jobs.length,
    interviews: interviews.length,
    completedInterviews,
    averageInterviewScore: interviewScores.length ? Math.round(interviewScores.reduce((sum, score) => sum + score, 0) / interviewScores.length) : null,
    resumeScore: latestResume?.atsScore ?? null,
  };
}

function describeError(error) {
  if (!error) return 'We could not load your dashboard right now.';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error) return error.error;
  return 'We could not load your dashboard right now.';
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      setError('');
      setWarning('');
      return () => {
        active = false;
      };
    }

    async function loadDashboard() {
      setLoading(true);
      setError('');
      setWarning('');
      try {
        const [progressResult, jobsResult, interviewsResult, resumesResult] = await Promise.allSettled([
          api.get('/analytics/progress'),
          api.get('/jobs'),
          api.get('/interviews'),
          api.get('/resumes'),
        ]);

        if (!active) return;

        let nextOverview = null;
        let nextJobs = [];
        let nextInterviews = [];
        let nextResumes = [];
        const failures = [];

        if (progressResult.status === 'fulfilled') {
          const progressPayload = getApiPayload(progressResult.value);
          nextOverview = progressPayload.overview ?? null;
        } else {
          failures.push(progressResult.reason);
        }

        if (jobsResult.status === 'fulfilled') {
          const jobsPayload = getApiPayload(jobsResult.value);
          nextJobs = getArrayPayload(jobsPayload, 'jobs');
        } else {
          failures.push(jobsResult.reason);
        }

        if (interviewsResult.status === 'fulfilled') {
          const interviewsPayload = getApiPayload(interviewsResult.value);
          nextInterviews = getArrayPayload(interviewsPayload, 'interviews');
        } else {
          failures.push(interviewsResult.reason);
        }

        if (resumesResult.status === 'fulfilled') {
          const resumesPayload = getApiPayload(resumesResult.value);
          nextResumes = getArrayPayload(resumesPayload, 'resumes');
        } else {
          failures.push(resumesResult.reason);
        }

        if (!nextOverview) {
          nextOverview = buildOverview(nextJobs, nextInterviews, nextResumes);
        }

        setOverview(nextOverview);
        setJobs(nextJobs);
        setInterviews(nextInterviews);
        setResumes(nextResumes);

        if (failures.length && !nextJobs.length && !nextInterviews.length && !nextResumes.length && !nextOverview?.applications && !nextOverview?.interviews) {
          setError(describeError(failures[0]));
          setWarning('');
        } else if (failures.length) {
          setError('');
          setWarning('Some dashboard data is temporarily unavailable. Showing what is available.');
        }
      } catch (requestError) {
        if (!active) return;
        setError(describeError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [user]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
  const firstName = user?.name?.split(' ')[0] || 'there';
  const profileComplete = Boolean(user?.onboardingCompleted || (user?.targetRole && user?.experienceLevel && user?.skills?.length && user?.languages?.length && user?.interviewExperience));

  const readinessScore = useMemo(() => {
    if (!overview) {
      return profileComplete ? 42 : 18;
    }

    const base = profileComplete ? 30 : 10;
    const resumeBonus = overview.resumeScore != null ? Math.round(Math.max(0, overview.resumeScore - 40) * 0.35) : 0;
    const interviewBonus = overview.averageInterviewScore != null ? Math.round(overview.averageInterviewScore * 0.2) : 0;
    const applicationBonus = overview.applications ? Math.min(20, overview.applications * 4) : 0;
    const completedInterviewBonus = overview.completedInterviews ? 10 : 0;
    return Math.min(100, base + resumeBonus + interviewBonus + applicationBonus + completedInterviewBonus);
  }, [overview, profileComplete]);

  const stats = useMemo(() => [
    { label: 'Career readiness', value: loading ? '—' : `${readinessScore}/100`, note: profileComplete ? 'Your profile is ready for the next step' : 'Complete your profile', Icon: Target },
    { label: 'Resume ATS score', value: loading ? '—' : overview?.resumeScore != null ? `${overview.resumeScore}` : '—', note: overview?.resumeScore != null ? 'Latest analysis available' : 'Analyze your resume', Icon: FileText },
    { label: 'Interview score', value: loading ? '—' : overview?.averageInterviewScore != null ? `${overview.averageInterviewScore}` : '—', note: overview?.completedInterviews ? 'Mock interviews recorded' : 'Start your first session', Icon: Play },
    { label: 'Applications', value: loading ? '—' : `${overview?.applications ?? jobs.length}`, note: jobs.length ? 'Pipeline is active' : 'Build your pipeline', Icon: BriefcaseBusiness },
  ], [jobs.length, loading, overview, profileComplete, readinessScore]);

  const activityItems = useMemo(() => {
    const items = [];
    if (resumes[0]) {
      items.push({
        id: `resume-${resumes[0]._id}`,
        title: resumes[0].fileName || 'Resume',
        subtitle: resumes[0].atsScore != null ? `ATS score ${resumes[0].atsScore}` : 'Uploaded for analysis',
        createdAt: resumes[0].createdAt,
        kind: 'resume',
      });
    }

    jobs.slice(0, 3).forEach((job) => {
      items.push({
        id: `job-${job._id}`,
        title: `${job.company} • ${job.role}`,
        subtitle: job.status,
        createdAt: job.updatedAt || job.createdAt,
        kind: 'job',
      });
    });

    interviews.slice(0, 3).forEach((interview) => {
      items.push({
        id: `interview-${interview._id}`,
        title: interview.targetRole || 'Mock interview',
        subtitle: interview.status === 'completed' ? `Score ${interview.evaluation?.score ?? 'pending'}` : interview.status,
        createdAt: interview.updatedAt || interview.createdAt,
        kind: 'interview',
      });
    });

    return items.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()).slice(0, 4);
  }, [interviews, jobs, resumes]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{date}</p>
          <h1>Good {greeting}, <span className="text-accent">{firstName}</span></h1>
          <p className="subheading">Let&apos;s build your next career breakthrough.</p>
        </div>
        <Button type="button" onClick={() => navigate(profileComplete ? '/settings' : '/onboarding')}>
          <Sparkles size={16} /> {profileComplete ? 'Review profile' : 'Personalize profile'}
        </Button>
      </section>

      <section className="stat-grid">
        {stats.map(({ label, value, note, Icon }) => (
          <article className="stat-card" key={label}>
            <div className="stat-icon"><Icon size={18} /></div>
            <p className="label">{label}</p>
            <p className="stat-value">{value}</p>
            <p className="stat-note">{note} {label === 'Career readiness' && <ArrowUpRight size={13} />}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="card readiness-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Your starting point</p>
              <h2>Career readiness</h2>
            </div>
            <span className={`badge ${profileComplete ? 'badge-accent' : 'badge-muted'}`}>{profileComplete ? 'Profile ready' : 'Profile incomplete'}</span>
          </div>
          <div className="readiness-body">
            <div className="score-ring" style={{ background: `radial-gradient(var(--color-surface) 60%,transparent 61%),conic-gradient(${profileComplete ? 'var(--color-accent)' : 'var(--color-elevated)'} ${readinessScore}%, var(--color-elevated) 0)` }}>
              <strong>{loading ? '—' : readinessScore}</strong>
              <span>/ 100</span>
            </div>
            <div>
              <p className="body-copy">
                {loading
                  ? 'Loading your dashboard…'
                  : profileComplete
                    ? `You have ${jobs.length} tracked application${jobs.length === 1 ? '' : 's'} and ${interviews.length} interview${interviews.length === 1 ? '' : 's'} in motion.`
                    : 'Complete your profile and analyze a resume to unlock personalized recommendations, job matching, and interview preparation.'}
              </p>
              <Button variant="secondary" type="button" onClick={() => navigate(profileComplete ? '/resume' : '/onboarding')}>
                {profileComplete ? 'Review progress' : 'Complete profile'} <ArrowUpRight size={15} />
              </Button>
            </div>
          </div>
        </article>
        <article className="card coach-card">
          <div className="coach-glow"><MessageCircle size={22} /></div>
          <p className="eyebrow">Career Coach</p>
          <h2>Your personal AI partner</h2>
          <p className="body-copy">Ask anything about your career, resume, or next interview. CareerAI will learn what matters to you.</p>
          <Button type="button" onClick={() => navigate('/coach')}>Start a conversation <ArrowUpRight size={15} /></Button>
        </article>
      </section>

      <section className={`card ${activityItems.length ? 'activity-card' : 'empty-card'}`}>
        {error ? (
          <>
            <div className="empty-icon"><BriefcaseBusiness size={22} /></div>
            <h2>We could not refresh your latest activity</h2>
            <p className="body-copy">{error}</p>
          </>
        ) : loading ? (
          <>
            <div className="empty-icon"><BriefcaseBusiness size={22} /></div>
            <h2>Loading your activity</h2>
            <p className="body-copy">We are pulling in your latest resumes, interviews, and applications.</p>
          </>
        ) : activityItems.length ? (
          <>
            <div className="card-heading">
              <div>
                <p className="eyebrow">Your latest activity</p>
                <h2>What is moving now</h2>
              </div>
              <span className="badge badge-accent">Live data</span>
            </div>
            {warning ? <p className="body-copy">{warning}</p> : null}
            <ul className="activity-list">
              {activityItems.map((item) => (
                <li className="activity-item" key={item.id}>
                  <div className="activity-icon">
                    {item.kind === 'resume' ? <FileText size={16} /> : item.kind === 'job' ? <BriefcaseBusiness size={16} /> : <Play size={16} />}
                  </div>
                  <div className="activity-copy">
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>
                  <span className="activity-meta">{formatActivityDate(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="empty-icon"><BriefcaseBusiness size={22} /></div>
            <h2>Your career activity will appear here</h2>
            <p className="body-copy">Add your first resume or job application to start seeing insights and progress.</p>
            <div className="empty-actions">
              <Button variant="secondary" type="button" onClick={() => navigate('/resume')}><FileText size={16} /> Analyze resume</Button>
              <Button variant="ghost" type="button" onClick={() => navigate('/jobs')}><BriefcaseBusiness size={16} /> Add a job</Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
