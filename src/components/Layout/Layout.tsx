import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, signOut } = useAuth();
  const location = useLocation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <Link to="/" className="logo">
            Work Tracking
          </Link>
          <nav className="nav">
            <Link to="/teams" className={location.pathname === '/teams' ? 'active' : ''}>
              {t('team.title')}
            </Link>
            <Link to="/work-types" className={location.pathname === '/work-types' ? 'active' : ''}>
              {t('workTypes.title')}
            </Link>
            <Link to="/locations" className={location.pathname === '/locations' ? 'active' : ''}>
              {t('locations.title')}
            </Link>
            <Link to="/time-tracking" className={location.pathname === '/time-tracking' ? 'active' : ''}>
              {t('timeTracking.title')}
            </Link>
            <Link to="/reports" className={location.pathname === '/reports' ? 'active' : ''}>
              {t('reports.title')}
            </Link>
          </nav>
        </div>
        <div className="header-right">
          <select
            value={i18n.language}
            onChange={handleLanguageChange}
            className="language-select"
          >
            <option value="uk">Українська</option>
            <option value="en">English</option>
          </select>
          <div className="user-menu">
            <span className="user-email">{currentUser?.email}</span>
            <button onClick={signOut} className="sign-out-btn">
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 