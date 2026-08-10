import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ProtectedRoute } from './routes/ProtectedRoute.jsx';
import { OnboardingPage } from './pages/OnboardingPage.jsx';
import { ResumePage } from './pages/ResumePage.jsx';
import { JobsPage } from './pages/JobsPage.jsx';
import { CoachPage } from './pages/CoachPage.jsx';
import { MemoryPage } from './pages/MemoryPage.jsx';
import { InterviewsPage } from './pages/InterviewsPage.jsx';
import { ProgressPage } from './pages/ProgressPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
