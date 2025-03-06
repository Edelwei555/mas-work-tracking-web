import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  RouteProps
} from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import Layout from './components/Layout/Layout';
import Teams from './components/Teams/Teams';
import WorkTypes from './components/WorkTypes/WorkTypes';
import Locations from './components/Locations/Locations';
import TimeTracking from './components/TimeTracking/TimeTracking';
import Reports from './components/Reports/Reports';
import './i18n';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  console.log('PrivateRoute перевірка:', { 
    isAuthenticated: !!currentUser, 
    loading,
    path: window.location.pathname 
  });

  if (loading) {
    return <div>Завантаження...</div>;
  }

  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              } 
            />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/time-tracking" replace />} />
              <Route path="time-tracking" element={<TimeTracking />} />
              <Route path="teams" element={<Teams />} />
              <Route path="work-types" element={<WorkTypes />} />
              <Route path="locations" element={<Locations />} />
              <Route path="reports" element={<Reports />} />
            </Route>
            <Route path="*" element={<Navigate to="/time-tracking" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  console.log('PublicRoute перевірка:', { 
    isAuthenticated: !!currentUser, 
    loading,
    path: window.location.pathname 
  });

  if (loading) {
    return <div>Завантаження...</div>;
  }

  return currentUser ? <Navigate to="/time-tracking" replace /> : <>{children}</>;
};

export default App;
