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

const navItems = [
  { label: 'Облік часу', icon: <TimerIcon />, path: '/' },
  { label: 'Види робіт', icon: <WorkIcon />, path: '/work-types' },
  { label: 'Локації', icon: <LocationOnIcon />, path: '/locations' },
  { label: 'Команди', icon: <GroupIcon />, path: '/teams' },
  { label: 'Звіти', icon: <AssessmentIcon />, path: '/reports' },
  { label: 'Профіль', icon: <PersonIcon />, path: '/profile' },
  { label: 'Мова', icon: <LanguageIcon />, path: '/language' },
];

const StyledBottomNavigationAction = styled(BottomNavigationAction)(({ theme }) => ({
  '&.Mui-selected': {
    color: '#43a047', // зелений
  },
  minWidth: 0,
  maxWidth: 80,
  padding: '0 2px',
  fontSize: 10,
  [theme.breakpoints.down('sm')]: {
    fontSize: 9,
    minWidth: 0,
    maxWidth: 60,
    padding: '0 1px',
  },
}));

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [show, setShow] = useState(true);

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
    navigate(navItems[newValue].path);
  };

  return (
    <Slide direction="up" in={show} mountOnEnter unmountOnExit>
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1201, display: { xs: 'block', md: 'none' } }} elevation={8}>
        <BottomNavigation value={activeIndex} onChange={handleChange} showLabels sx={{ overflowX: 'auto', width: '100%' }}>
          {navItems.map((item, idx) => (
            <StyledBottomNavigationAction
              key={item.label}
              label={window.innerWidth < 400 ? '' : item.label}
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
  );
};

export default MobileBottomNav; 