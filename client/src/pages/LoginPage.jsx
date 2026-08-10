import { Eye, EyeOff, Github, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

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

export function LoginPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const navigate = useNavigate();
  const [providers, setProviders] = useState({ google: false, github: false });
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  useEffect(() => {
    api.get('/auth/providers').then((response) => setProviders(response.data.data)).catch(() => {});
  }, []);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/login', { email: form.email, password: form.password });
      window.location.href = '/dashboard';
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      setPendingEmail(form.email);
      setSuccess(response.data.data.message || 'We sent a verification code to your inbox.');
      if (response.data.data.otp) {
        setSuccess(`${response.data.data.message} Development code: ${response.data.data.otp}`);
      }
      setMode('verify');
      setOtp('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-email', { email: pendingEmail || form.email, otp });
      setSuccess('Email verified successfully.');
      window.location.href = '/dashboard';
    } catch (requestError) {
      setError(requestError.message || 'Unable to verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/resend-otp', { email: pendingEmail || form.email, purpose: mode === 'reset' ? 'password-reset' : 'signup' });
      setSuccess(response.data.data.message || 'A new code has been sent.');
      if (response.data.data.otp) {
        setSuccess(`${response.data.data.message} Development code: ${response.data.data.otp}`);
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to resend the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: form.email });
      setPendingEmail(form.email);
      setSuccess(response.data.data.message || 'We sent a reset code.');
      if (response.data.data.otp) {
        setSuccess(`${response.data.data.message} Development code: ${response.data.data.otp}`);
      }
      setMode('reset');
    } catch (requestError) {
      setError(requestError.message || 'Unable to send the reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { email: pendingEmail || form.email, otp, password: form.password });
      setSuccess('Password updated successfully.');
      setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
      setOtp('');
      setMode('login');
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link to="/dashboard" className="brand auth-brand">
          <span className="brand-mark">C</span>
          <span>
            Career<span className="text-accent">AI</span>
          </span>
        </Link>
        <div className="auth-copy">
          <span className="badge badge-accent">Your AI-powered career partner</span>
          <h1>Build a career you’re proud of.</h1>
          <p className="subheading">Sign in or create an account to get personalized guidance, sharper applications, and interview practice built around your goals.</p>
        </div>
        <div className="auth-actions">
          <a className={`oauth-btn ${!providers.google ? 'disabled' : ''} cursor-pointer`} href={providers.google ? `${apiBaseUrl}/auth/google` : undefined} aria-disabled={!providers.google}>
            <span className="google-g">G</span> Continue with Google
          </a>
          <a className={`oauth-btn ${!providers.github ? 'disabled' : ''}`} href={providers.github ? `${apiBaseUrl}/auth/github` : undefined} aria-disabled={!providers.github}>
            <Github size={18} /> Continue with GitHub
          </a>
        </div>
        {!providers.google && !providers.github && <p className="auth-note">OAuth providers are not configured yet. Add credentials to the server environment to enable sign in.</p>}
        <div className="auth-form-shell">
          {mode === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Sign in</h2>
              <label className="field auth-field">
                <span>Email</span>
                <input className="auth-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label className="field auth-field">
                <span>Password</span>
                <div className="password-field">
                  <input className="auth-input" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="Your password" autoComplete="current-password" required />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </label>
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
              <div className="auth-links">
                <button type="button" className="link-btn" onClick={() => setMode('register')}>Create account</button>
                <button type="button" className="link-btn" onClick={() => { setPendingEmail(form.email); setMode('forgot'); }}>Forgot password</button>
              </div>
            </form>
          )}
          {mode === 'register' && (
            <form className="auth-form" onSubmit={handleRegister}>
              <h2>Create account</h2>
              <label className="field auth-field">
                <span>Name</span>
                <input className="auth-input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Alex Johnson" autoComplete="name" required />
              </label>
              <label className="field auth-field">
                <span>Email</span>
                <input className="auth-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
              <label className="field auth-field">
                <span>Password</span>
                <div className="password-field">
                  <input className="auth-input" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="Create a password" autoComplete="new-password" required />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <div className="password-strength" aria-live="polite">
                  <div className="password-strength-bar"><span style={{ width: `${(passwordStrength.score / 4) * 100}%`, backgroundColor: passwordStrength.color }} /></div>
                  <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                </div>
              </label>
              <label className="field auth-field">
                <span>Confirm password</span>
                <div className="password-field">
                  <input className="auth-input" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder="Repeat your password" autoComplete="new-password" required />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setShowConfirmPassword((current) => !current)}>{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </label>
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
              <button type="button" className="link-btn" onClick={() => setMode('login')}>Back to sign in</button>
            </form>
          )}
          {mode === 'verify' && (
            <form className="auth-form" onSubmit={handleVerify}>
              <h2>Verify your email</h2>
              <p className="auth-note">Enter the 6-digit code that was sent to {pendingEmail || form.email}.</p>
              <label className="field auth-field">
                <span>Verification code</span>
                <input className="auth-input" inputMode="numeric" pattern="[0-9]*" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" required />
              </label>
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify email'}</button>
              <div className="auth-links">
                <button type="button" className="link-btn" onClick={handleResend}>Resend code</button>
                <button type="button" className="link-btn" onClick={() => setMode('login')}>Back to sign in</button>
              </div>
            </form>
          )}
          {mode === 'forgot' && (
            <form className="auth-form" onSubmit={handleForgotPassword}>
              <h2>Forgot password</h2>
              <p className="auth-note">We’ll send an OTP to your email so you can reset your password.</p>
              <label className="field auth-field">
                <span>Email</span>
                <input className="auth-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Sending code...' : 'Send reset code'}</button>
              <button type="button" className="link-btn" onClick={() => setMode('login')}>Back to sign in</button>
            </form>
          )}
          {mode === 'reset' && (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <h2>Reset password</h2>
              <label className="field auth-field">
                <span>Reset code</span>
                <input className="auth-input" inputMode="numeric" pattern="[0-9]*" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" required />
              </label>
              <label className="field auth-field">
                <span>New password</span>
                <div className="password-field">
                  <input className="auth-input" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="Choose a new password" autoComplete="new-password" required />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
                <div className="password-strength" aria-live="polite">
                  <div className="password-strength-bar"><span style={{ width: `${(passwordStrength.score / 4) * 100}%`, backgroundColor: passwordStrength.color }} /></div>
                  <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                </div>
              </label>
              <label className="field auth-field">
                <span>Confirm password</span>
                <div className="password-field">
                  <input className="auth-input" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} placeholder="Repeat your new password" autoComplete="new-password" required />
                  <button type="button" className="field-icon" aria-label="Toggle password visibility" onClick={() => setShowConfirmPassword((current) => !current)}>{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </label>
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>{loading ? 'Updating...' : 'Reset password'}</button>
              <div className="auth-links">
                <button type="button" className="link-btn" onClick={handleResend}>Resend code</button>
                <button type="button" className="link-btn" onClick={() => setMode('login')}>Back to sign in</button>
              </div>
            </form>
          )}
          {(error || success) && <p className={error ? 'form-error' : 'form-success'} role="alert">{error || success}</p>}
        </div>
        <div className="auth-trust">
          <ShieldCheck size={16} /> Secure authentication with HTTP-only cookies <LockKeyhole size={15} />
        </div>
      </section>
    </main>
  );
}
