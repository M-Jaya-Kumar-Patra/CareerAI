import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const experienceOptions = [['student', 'Student'], ['fresher', 'Fresher'], ['0-1', '0–1 years'], ['1-3', '1–3 years'], ['3+', '3+ years']];
const skillOptions = ['React', 'Node.js', 'Python', 'Java', 'C++', 'MongoDB', 'SQL', 'AWS', 'Figma', 'Data Analysis'];

export function OnboardingPage() {
  const { user, updateProfile } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '', currentRole: '', targetRole: '', experienceLevel: 'fresher',
    skills: [], preferredLocations: [], careerGoals: '', interviewExperience: 'none',
    preferences: { interviewDifficulty: 'medium', responseStyle: 'balanced', theme: 'system' },
  });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleSkill = (skill) => update('skills', form.skills.includes(skill) ? form.skills.filter((item) => item !== skill) : [...form.skills, skill]);
  const finish = async () => {
    setError('');
    if (!form.name.trim() || !form.targetRole.trim()) return setError('Please add your name and target role to continue.');
    setSaving(true);
    try {
      await updateProfile(form);
      setTheme(form.preferences.theme);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your profile. Please try again.');
    } finally { setSaving(false); }
  };
  return (
    <main className="onboarding-page">
      <div className="onboarding-shell">
        <header className="onboarding-header"><div className="brand"><span className="brand-mark">C</span><span>Career<span className="text-accent">AI</span></span></div><span className="onboarding-step">Step {step} of 2</span></header>
        <div className="onboarding-progress"><span style={{ width: `${step * 50}%` }} /></div>
        <section className="onboarding-card">
          <div className="onboarding-intro"><span className="onboarding-icon"><Sparkles size={20} /></span><p className="eyebrow">Let&apos;s personalize your experience</p><h1>{step === 1 ? 'Tell us where you want to go.' : 'Make CareerAI work your way.'}</h1><p className="subheading">{step === 1 ? 'A few details help us tailor every recommendation to your goals.' : 'You can change these preferences any time in Settings.'}</p></div>
          {step === 1 ? <div className="form-grid">
            <label className="field field-wide"><span>Your name</span><input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Alex Johnson" autoComplete="name" /></label>
            <label className="field"><span>Current role <small>Optional</small></span><input value={form.currentRole} onChange={(event) => update('currentRole', event.target.value)} placeholder="e.g. Computer science student" /></label>
            <label className="field"><span>Target role</span><input value={form.targetRole} onChange={(event) => update('targetRole', event.target.value)} placeholder="e.g. Full-stack developer" /></label>
            <fieldset className="field-group field-wide"><legend>Experience level</legend><div className="choice-grid">{experienceOptions.map(([value, label]) => <button type="button" className={`choice ${form.experienceLevel === value ? 'selected' : ''}`} onClick={() => update('experienceLevel', value)} key={value}>{form.experienceLevel === value && <Check size={14} />}{label}</button>)}</div></fieldset>
            <fieldset className="field-group field-wide"><legend>Skills you want to use</legend><div className="choice-grid skills">{skillOptions.map((skill) => <button type="button" className={`choice ${form.skills.includes(skill) ? 'selected' : ''}`} onClick={() => toggleSkill(skill)} key={skill}>{form.skills.includes(skill) && <Check size={14} />}{skill}</button>)}</div></fieldset>
          </div> : <div className="form-grid">
            <label className="field field-wide"><span>Preferred locations <small>Optional</small></span><input value={form.preferredLocations.join(', ')} onChange={(event) => update('preferredLocations', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="e.g. Bengaluru, Remote, London" /></label>
            <label className="field field-wide"><span>What are you working toward?</span><textarea value={form.careerGoals} onChange={(event) => update('careerGoals', event.target.value)} placeholder="Tell us what success looks like for you..." rows="3" /></label>
            <label className="field"><span>Interview experience</span><select value={form.interviewExperience} onChange={(event) => update('interviewExperience', event.target.value)}><option value="none">I&apos;m just getting started</option><option value="some">I&apos;ve done a few interviews</option><option value="confident">I&apos;m experienced</option></select></label>
            <label className="field"><span>Interview difficulty</span><select value={form.preferences.interviewDifficulty} onChange={(event) => update('preferences', { ...form.preferences, interviewDifficulty: event.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
            <label className="field"><span>Response style</span><select value={form.preferences.responseStyle} onChange={(event) => update('preferences', { ...form.preferences, responseStyle: event.target.value })}><option value="concise">Concise</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option></select></label>
            <label className="field"><span>Theme</span><select value={form.preferences.theme} onChange={(event) => update('preferences', { ...form.preferences, theme: event.target.value })}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          </div>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="onboarding-actions">{step === 2 && <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>}<button type="button" className="btn btn-primary onboarding-next" onClick={step === 1 ? () => { if (!form.name.trim() || !form.targetRole.trim()) setError('Please add your name and target role to continue.'); else { setError(''); setStep(2); } } : finish} disabled={saving}>{saving ? 'Saving...' : step === 1 ? <>Continue <ArrowRight size={16} /></> : <>Enter my workspace <ArrowRight size={16} /></>}</button></footer>
        </section>
      </div>
    </main>
  );
}
