import { ArrowUpRight, BriefcaseBusiness, FileText, MessageCircle, Play, Sparkles, Target } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const stats = [['Career readiness', '—', 'Complete your profile', Target], ['Resume ATS score', '—', 'Analyze your resume', FileText], ['Interview score', '—', 'Start your first session', Play], ['Applications', '0', 'Build your pipeline', BriefcaseBusiness]];

export function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
  const firstName = user?.name?.split(' ')[0] || 'there';
  return (
    <div className="page-stack">
      <section className="page-heading"><div><p className="eyebrow">{date}</p><h1>Good {greeting}, <span className="text-accent">{firstName}</span></h1><p className="subheading">Let&apos;s build your next career breakthrough.</p></div><Button><Sparkles size={16} /> Personalize profile</Button></section>
      <section className="stat-grid">{stats.map(([label, value, note, Icon]) => <article className="stat-card" key={label}><div className="stat-icon"><Icon size={18} /></div><p className="label">{label}</p><p className="stat-value">{value}</p><p className="stat-note">{note} {label === 'Career readiness' && <ArrowUpRight size={13} />}</p></article>)}</section>
      <section className="dashboard-grid">
        <article className="card readiness-card"><div className="card-heading"><div><p className="eyebrow">Your starting point</p><h2>Career readiness</h2></div><span className="badge badge-muted">Profile incomplete</span></div><div className="readiness-body"><div className="score-ring"><strong>—</strong><span>/ 100</span></div><div><p className="body-copy">Complete your profile and analyze a resume to unlock personalized recommendations, job matching, and interview preparation.</p><Button variant="secondary">Complete profile <ArrowUpRight size={15} /></Button></div></div></article>
        <article className="card coach-card"><div className="coach-glow"><MessageCircle size={22} /></div><p className="eyebrow">Career Coach</p><h2>Your personal AI partner</h2><p className="body-copy">Ask anything about your career, resume, or next interview. CareerAI will learn what matters to you.</p><Button>Start a conversation <ArrowUpRight size={15} /></Button></article>
      </section>
      <section className="card empty-card"><div className="empty-icon"><BriefcaseBusiness size={22} /></div><h2>Your career activity will appear here</h2><p className="body-copy">Add your first resume or job application to start seeing insights and progress.</p><div className="empty-actions"><Button variant="secondary"><FileText size={16} /> Analyze resume</Button><Button variant="ghost"><BriefcaseBusiness size={16} /> Add a job</Button></div></section>
    </div>
  );
}
