import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button, IconButton, Menu, MenuItem } from '@mui/material';
import { Timer, Group, Language } from '@mui/icons-material';
import './Navigation.css';

const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentUser, signOut } = useAuth();
  const [languageAnchor, setLanguageAnchor] = React.useState<null | HTMLElement>(null);

  const handleLanguageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageAnchor(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageAnchor(null);
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (!currentUser) return null;

  return (
    <div className="navigation">
      <div className="nav-left">
        <h1 className="logo">Work Tracking</h1>
      </div>

      <div className="nav-center">
        <Button
          color="inherit"
          component={Link}
          to="/"
          startIcon={<Timer />}
          className={location.pathname === '/' ? 'active' : ''}
        >
          {t('nav.timeTracking')}
        </Button>

        <Button
          color="inherit"
          component={Link}
          to="/teams"
          startIcon={<Group />}
          className={location.pathname.startsWith('/teams') ? 'active' : ''}
        >
          {t('nav.teams')}
        </Button>
      </div>

      <div className="nav-right">
        <IconButton
          onClick={handleLanguageMenu}
          color="inherit"
        >
          <Language />
        </IconButton>

        <Menu
          anchorEl={languageAnchor}
          open={Boolean(languageAnchor)}
          onClose={handleLanguageClose}
        >
          <MenuItem onClick={() => { handleLanguageClose(); /* Додати зміну мови */ }}>
            Українська
          </MenuItem>
          <MenuItem onClick={() => { handleLanguageClose(); /* Додати зміну мови */ }}>
            English
          </MenuItem>
        </Menu>

        <div className="user-info">
          <Link to="/profile" className="email-link">
            {currentUser.email}
          </Link>
          <Button
            color="inherit"
            onClick={handleLogout}
            className="logout-button"
          >
            {t('nav.logout')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Navigation; 