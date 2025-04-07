import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import { CircularProgress } from '@mui/material';
import { useTimerSync } from './hooks/useTimerSync';
import Layout from './components/Layout/Layout';
import './i18n';
import { Provider } from 'react-redux';
import { store } from './store';

const App: React.FC = () => {
  useTimerSync(); // Хук для синхронізації таймера

  return (
    <Provider store={store}>
      <ErrorBoundary>
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
          <div className="app">
            <Routes>
              <Route path="/*" element={<Layout />}>
                <Route path="*" element={<AppRoutes />} />
              </Route>
            </Routes>
          </div>
        </Suspense>
      </ErrorBoundary>
    </Provider>
  );
};

export default App;
