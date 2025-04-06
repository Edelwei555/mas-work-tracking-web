import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import { CircularProgress } from '@mui/material';
import { useTimerSync } from './hooks/useTimerSync';
import { Navigation } from './components/Navigation';

const App: React.FC = () => {
  useTimerSync(); // Хук для синхронізації таймера

  return (
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
          <Navigation />
          <Routes>
            <Route path="/" element={<AppRoutes />} />
          </Routes>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
