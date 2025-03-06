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
  const { currentUser } = useAuth();
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app">
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/time-tracking" replace />} />
              <Route path="teams" element={<Teams />} />
              <Route path="work-types" element={<WorkTypes />} />
              <Route path="locations" element={<Locations />} />
              <Route path="time-tracking" element={<TimeTracking />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
