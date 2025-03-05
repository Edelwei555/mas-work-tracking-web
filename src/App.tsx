import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import LanguageSwitcher from './components/LanguageSwitcher';
import './styles/Auth.css';
import './styles/LanguageSwitcher.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="app">
        <header className="app-header">
          <LanguageSwitcher />
        </header>
        <main className="app-main">
          <LoginForm />
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
