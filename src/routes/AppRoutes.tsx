import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/Auth/LoginForm';
import ForgotPassword from '../components/Auth/ForgotPassword';
import Profile from '../components/Profile/Profile';
import TimeTracking from '../components/TimeTracking/TimeTracking';
import Teams from '../components/Teams/Teams';
import TeamMembers from '../components/Teams/TeamMembers';
import Layout from '../components/Layout/Layout';

// Компонент-обгортка для TeamMembers
const TeamMembersWrapper: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { currentUser } = useAuth();

  if (!teamId || !currentUser) {
    return <Navigate to="/teams" replace />;
  }

  return (
    <TeamMembers
      teamId={teamId}
      members={[]} // Це буде заповнено в компоненті
      onUpdate={() => {}} // Це буде заповнено в компоненті
    />
  );
};

const AppRoutes: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Публічні маршрути */}
      <Route path="/login" element={
        currentUser ? <Navigate to="/" replace /> : <LoginForm onSuccess={() => {}} />
      } />
      <Route path="/forgot-password" element={
        currentUser ? <Navigate to="/" replace /> : <ForgotPassword />
      } />

      {/* Захищені маршрути */}
      <Route path="/" element={
        currentUser ? <Layout /> : <Navigate to="/login" replace />
      }>
        <Route index element={<TimeTracking />} />
        <Route path="profile" element={<Profile />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:teamId" element={<TeamMembersWrapper />} />
      </Route>

      {/* Перенаправлення невідомих маршрутів */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes; 