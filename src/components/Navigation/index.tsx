import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './styles.css';

export const Navigation = () => {
  const { currentUser, signOut } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <nav className="main-navigation">
      <div className="nav-left">
        <Link to="/" className="logo">Work Tracking</Link>
        <Link to="/" className="nav-item active">
          <i className="nav-icon timer-icon"></i>
          {t('nav.timeTracking')}
        </Link>
        <Link to="/work-types" className="nav-item">
          <i className="nav-icon work-icon"></i>
          {t('nav.workTypes')}
        </Link>
        <Link to="/locations" className="nav-item">
          <i className="nav-icon location-icon"></i>
          {t('nav.locations')}
        </Link>
        <Link to="/teams" className="nav-item">
          <i className="nav-icon team-icon"></i>
          {t('nav.teams')}
        </Link>
        <Link to="/reports" className="nav-item">
          <i className="nav-icon report-icon"></i>
          {t('nav.reports')}
        </Link>
      </div>
      <div className="nav-right">
        <span className="user-email">
          <i className="nav-icon globe-icon"></i>
          {currentUser?.email}
        </span>
        <button onClick={handleLogout} className="logout-button">
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  );
};

export default Navigation; 