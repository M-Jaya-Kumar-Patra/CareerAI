import { ArrowLeft, Eye, EyeOff, Lock, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

const experienceOptions = [['student', 'Student'], ['fresher', 'Fresher'], ['0-1', '0–1 years'], ['1-3', '1–3 years'], ['3+', '3+ years']];
const interviewExperienceOptions = [['none', 'Just getting started'], ['some', 'Some experience'], ['confident', 'Confident']];

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Enter a password', color: 'var(--color-muted)' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score, label: 'Good', color: '#38bdf8' };
  return { score, label: 'Strong', color: '#10b981' };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profile, setProfile] = useState({
    name: user?.name || '',
    currentRole: user?.currentRole || '',
    targetRole: user?.targetRole || '',
    experienceLevel: user?.experienceLevel || 'fresher',
    skills: user?.skills || [],
    languages: user?.languages || [],
    careerGoals: user?.careerGoals || '',
    interviewExperience: user?.interviewExperience || 'none',
    preferences: {
      interviewDifficulty: user?.preferences?.interviewDifficulty || 'medium',
      responseStyle: user?.preferences?.responseStyle || 'balanced',
      theme: user?.preferences?.theme || 'system',
    },
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordVisible, setPasswordVisible] = useState({ current: false, new: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const passwordStrength = useMemo(() => getPasswordStrength(passwordForm.newPassword), [passwordForm.newPassword]);

  const updateField = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const updateNestedField = (key, value) => setProfile((current) => ({ ...current, preferences: { ...current.preferences, [key]: value } }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!profile.name.trim() || !profile.targetRole.trim()) {
      setError('Please add your name and target role.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        ...profile,
        skills: profile.skills.filter(Boolean),
        languages: profile.languages.filter(Boolean),
      });
      setSuccess('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your profile right now.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (requestError) {
      setError(requestError.message || 'Unable to change your password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm('This will permanently delete your account and all associated data. Continue?');
    if (!confirmed) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await api.delete('/auth/me');
      window.location.href = '/login';
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete your account.');
      setDeleting(false);
    }
  };

  return (
    <main className="settings-page">
      <div className="settings-shell">
        <header className="settings-header">
          <button type="button" className="ghost-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
          <div>
            <p className="eyebrow">Account settings</p>
            <h1>My profile</h1>
            <p className="subheading">Keep your CareerAI experience aligned with your goals.</p>
          </div>
        </header>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        <div className="settings-grid">
          <section className="settings-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Profile</p>
                <h2>Shape your CareerAI experience.</h2>
              </div>
              <button type="button" className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
            <form className="form-grid" onSubmit={saveProfile}>
              <label className="field field-wide">
                <span>Name</span>
                <input value={profile.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Your name" autoComplete="name" />
              </label>
              <label className="field">
                <span>Current role</span>
                <input value={profile.currentRole} onChange={(event) => updateField('currentRole', event.target.value)} placeholder="e.g. Product Designer" />
              </label>
              <label className="field">
                <span>Target role</span>
                <input value={profile.targetRole} onChange={(event) => updateField('targetRole', event.target.value)} placeholder="e.g. Senior Frontend Engineer" />
              </label>
              <label className="field">
                <span>Experience level</span>
                <select value={profile.experienceLevel} onChange={(event) => updateField('experienceLevel', event.target.value)}>
                  {experienceOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Interview experience</span>
                <select value={profile.interviewExperience} onChange={(event) => updateField('interviewExperience', event.target.value)}>
                  {interviewExperienceOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="field field-wide">
                <span>Skills</span>
                <input value={profile.skills.join(', ')} onChange={(event) => updateField('skills', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="React, Node, SQL" />
              </label>
              <label className="field field-wide">
                <span>Languages</span>
                <input value={profile.languages.join(', ')} onChange={(event) => updateField('languages', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="English, Hindi" />
              </label>
              <label className="field field-wide">
                <span>Career goals</span>
                <textarea value={profile.careerGoals} onChange={(event) => updateField('careerGoals', event.target.value)} rows="3" placeholder="Tell CareerAI what success looks like for you." />
              </label>
              <label className="field">
                <span>Preferred interview difficulty</span>
                <select value={profile.preferences.interviewDifficulty} onChange={(event) => updateNestedField('interviewDifficulty', event.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <label className="field">
                <span>Response style</span>
                <select value={profile.preferences.responseStyle} onChange={(event) => updateNestedField('responseStyle', event.target.value)}>
                  <option value="concise">Concise</option>
                  <option value="balanced">Balanced</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
              <label className="field">
                <span>Theme</span>
                <select value={profile.preferences.theme} onChange={(event) => updateNestedField('theme', event.target.value)}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </form>
          </section>
          <section className="settings-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Security</p>
                <h2>Change password</h2>
              </div>
            </div>
            <form className="form-grid" onSubmit={changePassword}>
              <label className="field field-wide">
                <span>Current password</span>
                <div className="password-field">
                  <input type={passwordVisible.current ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="Your current password" />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setPasswordVisible((current) => ({ ...current, current: !current.current }))}>{passwordVisible.current ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </label>
              <label className="field field-wide">
                <span>New password</span>
                <div className="password-field">
                  <input type={passwordVisible.new ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="Choose a strong password" />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setPasswordVisible((current) => ({ ...current, new: !current.new }))}>{passwordVisible.new ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <div className="password-strength" aria-live="polite">
                  <div className="password-strength-bar"><span style={{ width: `${(passwordStrength.score / 4) * 100}%`, backgroundColor: passwordStrength.color }} /></div>
                  <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                </div>
              </label>
              <label className="field field-wide">
                <span>Confirm password</span>
                <div className="password-field">
                  <input type={passwordVisible.confirm ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Repeat your new password" />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setPasswordVisible((current) => ({ ...current, confirm: !current.confirm }))}>{passwordVisible.confirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </label>
              <button type="submit" className="btn btn-secondary" disabled={changingPassword}>
                <Lock size={16} /> {changingPassword ? 'Updating...' : 'Update password'}
              </button>
            </form>
            <div className="settings-danger-zone">
              <div>
                <h3>Delete account</h3>
                <p>Remove your account and data from CareerAI permanently.</p>
              </div>
              <button type="button" className="btn btn-danger" onClick={deleteAccount} disabled={deleting}>
                <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
