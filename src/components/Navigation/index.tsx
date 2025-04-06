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
    <nav className="navigation">
      <ul>
        <li>
          <Link to="/">{t('nav.timeTracking')}</Link>
        </li>
        <li>
          <Link to="/teams">{t('nav.teams')}</Link>
        </li>
        <li>
          <Link to="/reports">{t('reports.title')}</Link>
        </li>
        {currentUser && (
          <li>
            <button onClick={handleLogout}>{t('nav.logout')}</button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navigation; 