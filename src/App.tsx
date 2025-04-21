import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import { CircularProgress } from '@mui/material';
import Layout from './components/Layout/Layout';

const App: React.FC = () => {
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
          <Routes>
            <Route path="/*" element={<Layout />}>
              <Route path="*" element={<AppRoutes />} />
            </Route>
          </Routes>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
