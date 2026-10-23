import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { RequireAdmin, RequireAuth, RequireGuest } from '@/components/guards';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { MentorsPage } from '@/pages/MentorsPage';
import { MentorDetailPage } from '@/pages/MentorDetailPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { BookingDetailPage } from '@/pages/BookingDetailPage';
import { PointsPage } from '@/pages/PointsPage';
import { MissionsPage } from '@/pages/MissionsPage';
import { RewardsPage } from '@/pages/RewardsPage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SchedulePage } from '@/pages/SchedulePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { AdminPage } from '@/pages/AdminPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        }
      />
      <Route
        path="/register"
        element={
          <RequireGuest>
            <RegisterPage />
          </RequireGuest>
        }
      />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="mentors" element={<MentorsPage />} />
        <Route path="mentors/:id" element={<MentorDetailPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="points" element={<PointsPage />} />
        <Route path="missions" element={<MissionsPage />} />
        <Route path="rewards" element={<RewardsPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="schedule"
          element={
            <RequireAuth>
              <SchedulePage />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
      </Route>

      <Route path="/app/*" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
