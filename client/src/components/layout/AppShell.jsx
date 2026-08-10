import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Brain, BriefcaseBusiness, FileText, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, Settings, Sun, Video } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const links = [
  ['Dashboard', '/dashboard', LayoutDashboard], ['Career Coach', '/coach', MessageCircle], ['AI Memory', '/memory', Brain],
  ['Resume', '/resume', FileText], ['Jobs', '/jobs', BriefcaseBusiness],
  ['Interviews', '/interviews', Video], ['Progress', '/progress', BarChart3],
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark">C</span><span>Career<span className="text-accent">AI</span></span></div>
        <nav className="nav-list" aria-label="Primary navigation">
          {links.map(([label, to, Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
        </nav>
        <NavLink to="/settings" onClick={() => setOpen(false)} className={({ isActive }) => `nav-item nav-settings ${isActive ? 'active' : ''}`}><Settings size={18} /><span>Settings</span></NavLink>
      </aside>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <div className="topbar-spacer" />
          <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="user-chip"><div className="avatar">{user?.name?.slice(0, 2).toUpperCase() || 'U'}</div><span>{user?.name || user?.email || 'Account'}</span><button className="icon-btn logout-btn" aria-label="Log out" onClick={async () => { await logout(); navigate('/login'); }}><LogOut size={16} /></button></div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
