import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import { CircularProgress } from '@mui/material';
import { TimerProvider } from './contexts/TimerContext';
import { Provider } from 'react-redux';
import { store } from './store/store';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
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
              <TimerProvider>
                <div className="app">
                  <AppRoutes />
                </div>
              </TimerProvider>
            </AuthProvider>
          </Suspense>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
