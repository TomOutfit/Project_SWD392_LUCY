// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/Navbar';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import BrowseRoomsPage from '@/pages/BrowseRoomsPage';
import CreateRoomPage from '@/pages/CreateRoomPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import ProfilePage from '@/pages/ProfilePage';
import PodcastsPage from '@/pages/PodcastsPage';
import DashboardPage from '@/pages/DashboardPage';
import SpeakingRoomPage from '@/pages/SpeakingRoomPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A35',
            color: '#F0F4FF',
            border: '1px solid #2A2A4A',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: '#00FF9F', secondary: '#0B0B1A' },
          },
          error: {
            iconTheme: { primary: '#FF2D6B', secondary: '#0B0B1A' },
          },
        }}
      />

      <div className="min-h-screen bg-void">
        {isAuthenticated && <Navbar />}
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />

          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/browse" element={
            <ProtectedRoute><BrowseRoomsPage /></ProtectedRoute>
          } />
          <Route path="/create-room" element={
            <ProtectedRoute><CreateRoomPage /></ProtectedRoute>
          } />
          <Route path="/speaking" element={<Navigate to="/browse" replace />} />
          <Route path="/speaking/:roomId" element={
            <ProtectedRoute><SpeakingRoomPage /></ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/podcasts" element={
            <ProtectedRoute><PodcastsPage /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
