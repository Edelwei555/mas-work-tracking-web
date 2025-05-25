import React, { useEffect, useState } from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, Badge, Slide } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupIcon from '@mui/icons-material/Group';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPendingTimeEntries } from '../../services/timeTracking';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const StyledBottomNavigationAction = styled(BottomNavigationAction)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  '&.Mui-selected': {
    color: '#43a047', // зелений
  },
  minWidth: 0,
  maxWidth: 80,
  padding: '0 2px',
  fontSize: 12,
  [theme.breakpoints.down('sm')]: {
    fontSize: 11,
    minWidth: 0,
    maxWidth: 60,
    padding: '0 1px',
  },
  '& .MuiBottomNavigationAction-label': {
    fontSize: 13,
    [theme.breakpoints.down('sm')]: {
      fontSize: 12,
    },
  },
  '& .MuiSvgIcon-root': {
    fontSize: 32,
    [theme.breakpoints.down('sm')]: {
      fontSize: 28,
    },
    display: 'block',
    margin: '0 auto',
  },
  '& .MuiBadge-badge': {
    fontSize: 14,
    minWidth: 22,
    height: 22,
    top: 6,
    right: -8,
    transform: 'none',
  },
}));

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [show, setShow] = useState(true);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { label: t('nav.timeTracking'), icon: <TimerIcon />, path: '/' },
    { label: t('workTypes.title'), icon: <WorkIcon />, path: '/work-types' },
    { label: t('locations.title'), icon: <LocationOnIcon />, path: '/locations' },
    { label: t('nav.teams'), icon: <GroupIcon />, path: '/teams' },
    { label: t('reports.title'), icon: <AssessmentIcon />, path: '/reports' },
    { label: t('nav.profile', 'Profile'), icon: <PersonIcon />, path: '/profile' },
    { label: t('language', 'Language'), icon: <LanguageIcon />, path: '/language' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY < 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchPending = async () => {
      if (currentUser) {
        const entries = await getPendingTimeEntries(currentUser.uid);
        setPendingCount(entries.length);
      }
    };
    fetchPending();
  }, [currentUser]);

  // Визначаємо активний індекс
  const activeIndex = navItems.findIndex(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  const handleChange = (_: any, newValue: number) => {
    const item = navItems[newValue];
    if (item.label === 'Мова') {
      setLanguageMenuOpen(true);
      return;
    }
    navigate(item.path);
  };

  return (
    <>
      <Slide direction="up" in={show} mountOnEnter unmountOnExit>
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1201, height: 110, display: { xs: 'flex', sm: 'flex', md: 'none' }, alignItems: 'center' }} elevation={8}>
          <BottomNavigation value={activeIndex} onChange={handleChange} showLabels sx={{ overflowX: 'auto', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            {navItems.map((item, idx) => (
              <StyledBottomNavigationAction
                key={item.label}
                label={item.label}
                icon={
                  item.label === 'Облік часу' && pendingCount > 0 ? (
                    <Badge badgeContent={pendingCount} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )
                }
              />
            ))}
          </BottomNavigation>
        </Paper>
      </Slide>
      {/* Модальне меню вибору мови */}
      {languageMenuOpen && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 70, zIndex: 1300, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 12, margin: '0 auto', width: '90%', maxWidth: 320, padding: 16, textAlign: 'center' }}>
          <button style={{ fontSize: 18, margin: 8, color: '#43a047', background: 'none', border: 'none' }} onClick={() => { window.localStorage.setItem('i18nextLng', 'uk'); window.location.reload(); }}>Українська</button>
          <button style={{ fontSize: 18, margin: 8, color: '#43a047', background: 'none', border: 'none' }} onClick={() => { window.localStorage.setItem('i18nextLng', 'en'); window.location.reload(); }}>English</button>
          <div>
            <button style={{ marginTop: 8, color: '#888', background: 'none', border: 'none' }} onClick={() => setLanguageMenuOpen(false)}>Скасувати</button>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav; 