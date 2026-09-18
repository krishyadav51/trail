import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Public pages
import HomePage       from './pages/HomePage';
import RegisterPage   from './pages/RegisterPage';
import TeamLoginPage  from './pages/TeamLoginPage';
import GamePage       from './pages/GamePage';
// import LeaderboardPage from './pages/LeaderboardPage';

// Admin pages
import AdminDashboard    from './pages/admin/AdminDashboard';
import AdminSubmissions  from './pages/admin/AdminSubmissions';
import AdminTeams        from './pages/admin/AdminTeams';
import AdminLeaderboard  from './pages/admin/AdminLeaderboard';
import AdminParticipants from './pages/admin/AdminParticipants';
import AdminLoginPage     from './pages/AdminLoginPage';
import RequireAdmin       from './components/RequireAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/"           element={<HomePage />} />
        <Route path="/register"   element={<RegisterPage />} />
        <Route path="/team"       element={<TeamLoginPage />} />
        <Route path="/game"       element={<GamePage />} />
        {/* <Route path="/leaderboard" element={<LeaderboardPage />} /> */}

        {/* Admin routes */}
        <Route path="/admin/login"          element={<AdminLoginPage />} />
        <Route path="/admin"                element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/submissions"    element={<RequireAdmin><AdminSubmissions /></RequireAdmin>} />
        <Route path="/admin/teams"          element={<RequireAdmin><AdminTeams /></RequireAdmin>} />
        <Route path="/admin/participants"   element={<RequireAdmin><AdminParticipants /></RequireAdmin>} />
        <Route path="/admin/leaderboard"    element={<RequireAdmin><AdminLeaderboard /></RequireAdmin>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
