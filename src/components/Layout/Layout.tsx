import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, IconButton, Menu, MenuItem } from '@mui/material';
import { Timer, Group, Language } from '@mui/icons-material';
import './Layout.css';

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, signOut } = useAuth();
  const location = useLocation();
  const [languageAnchor, setLanguageAnchor] = React.useState<null | HTMLElement>(null);

  const handleLanguageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageAnchor(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageAnchor(null);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    handleLanguageClose();
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (!currentUser) return null;

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <Link to="/" className="logo">
            Work Tracking
          </Link>
          <nav className="nav">
            <Button
              component={Link}
              to="/"
              startIcon={<Timer />}
              className={location.pathname === '/' ? 'active' : ''}
            >
              {t('nav.timeTracking')}
            </Button>
            <Button
              component={Link}
              to="/teams"
              startIcon={<Group />}
              className={location.pathname.startsWith('/teams') ? 'active' : ''}
            >
              {t('nav.teams')}
            </Button>
          </nav>
        </div>
        
        <div className="header-right">
          <IconButton
            onClick={handleLanguageMenu}
            className="language-button"
          >
            <Language />
          </IconButton>

          <Menu
            anchorEl={languageAnchor}
            open={Boolean(languageAnchor)}
            onClose={handleLanguageClose}
          >
            <MenuItem onClick={() => handleLanguageChange('uk')}>
              Українська
            </MenuItem>
            <MenuItem onClick={() => handleLanguageChange('en')}>
              English
            </MenuItem>
          </Menu>

          <div className="user-menu">
            <Link to="/profile" className="user-email">
              {currentUser.email}
            </Link>
            <button onClick={handleLogout} className="sign-out-btn">
              {t('nav.logout')}
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