import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, signOut } = useAuth();
  const location = useLocation();
  const [languageAnchor, setLanguageAnchor] = React.useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    try {
      await signOut();
      // додаткова логіка після виходу
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };
};

export default Layout; 