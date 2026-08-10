import { Github, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function LoginPage() {
  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const [providers, setProviders] = useState({
    google: false,
    github: false,
  });
  const [devName, setDevName] = useState("Local Developer");
  const [devEmail, setDevEmail] = useState("you@example.com");
  const [devMessage, setDevMessage] = useState("");
  useEffect(() => {
    api
      .get("/auth/providers")
      .then((response) => setProviders(response.data.data))
      .catch(() => {});
  }, []);
  const devLogin = async () => {
    setDevMessage("");
    try {
      await api.post("/auth/dev-login", { name: devName, email: devEmail });
      window.location.href = "/dashboard";
    } catch (error) {
      setDevMessage(error.message || "Unable to sign in locally");
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
          <span className="badge badge-accent">
            Your AI-powered career partner
          </span>
          <h1>Build a career you’re proud of.</h1>
          <p className="subheading">
            Sign in to get personalized guidance, sharper applications, and
            interview practice built around your goals.
          </p>
        </div>
        <div className="auth-actions">
          <a
            className={`oauth-btn ${!providers.google ? "disabled" : ""} cursor-pointer`}
            href={providers.google ? `${apiBaseUrl}/auth/google` : undefined}
            aria-disabled={!providers.google}
          >
            <span className="google-g">G</span> Continue with Google
          </a>
          <a
            className={`oauth-btn ${!providers.github ? "disabled" : ""}`}
            href={providers.github ? `${apiBaseUrl}/auth/github` : undefined}
            aria-disabled={!providers.github}
          >
            <Github size={18} /> Continue with GitHub
          </a>
        </div>
        {!providers.google && !providers.github && (
          <p className="auth-note">
            OAuth providers are not configured yet. Add credentials to the
            server environment to enable sign in.
          </p>
        )}
        <div className="dev-login">
          <div className="otp-divider"><span>local development</span></div>
          <p className="auth-note">OAuth is optional during local development.</p>
          <div className="otp-row">
            <input className="auth-input" placeholder="Your name" value={devName} onChange={(event) => setDevName(event.target.value)} aria-label="Development account name" />
            <input className="auth-input" type="email" placeholder="you@example.com" value={devEmail} onChange={(event) => setDevEmail(event.target.value)} aria-label="Development account email" />
          </div>
          <button className="btn btn-secondary dev-login-btn" disabled={!devName.trim() || !devEmail.trim()} onClick={devLogin}>Continue locally</button>
          {devMessage && <p className="auth-note">{devMessage}</p>}
        </div>
        <div className="auth-trust">
          <ShieldCheck size={16} /> Secure authentication with HTTP-only cookies{" "}
          <LockKeyhole size={15} />
        </div>
      </section>
    </main>
  );
}
