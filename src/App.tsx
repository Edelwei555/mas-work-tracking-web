import React, { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import { CircularProgress } from '@mui/material';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <CircularProgress />
            <div>Завантаження...</div>
          </div>
        }>
          <AuthProvider>
            <div className="app">
              <AppRoutes />
            </div>
          </AuthProvider>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
