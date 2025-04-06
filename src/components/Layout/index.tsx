import React from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './styles.css';

const Layout: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">
          <h1>Work Tracking</h1>
        </div>
        <nav className="main-nav">
          <ul>
            <li>
              <span>{t('nav.timeTracking')}</span>
            </li>
            <li>
              <span>{t('nav.teams')}</span>
            </li>
            <li>
              <span>{t('reports.title')}</span>
            </li>
            {currentUser && (
              <li>
                <button onClick={handleLogout} className="logout-button">
                  {t('nav.logout')}
                </button>
              </li>
            )}
          </ul>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 