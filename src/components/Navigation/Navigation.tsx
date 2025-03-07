import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem } from '@mui/material';
import { AccountCircle, Timer, Group, Language } from '@mui/icons-material';
import './Navigation.css';

const Navigation: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentUser, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [languageAnchor, setLanguageAnchor] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageMenu = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageAnchor(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageClose = () => {
    setLanguageAnchor(null);
  };

  const handleProfile = () => {
    handleClose();
  };

  const handleLogout = async () => {
    handleClose();
    await signOut();
  };

  if (!currentUser) return null;

  return (
    <AppBar position="static" className="navigation">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Work Tracking
        </Typography>

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

        <IconButton
          onClick={handleLanguageMenu}
          color="inherit"
        >
          <Language />
        </IconButton>

        <IconButton
          onClick={handleMenu}
          color="inherit"
        >
          <AccountCircle />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={handleProfile} component={Link} to="/profile">
            {t('nav.profile')}
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            {t('nav.logout')}
          </MenuItem>
        </Menu>

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
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 