import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Location, getTeamLocations, addLocation, deleteLocation } from '../../services/locations';
import { getUserTeams } from '../../services/teams';
import './Locations.css';

const Locations: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: ''
  });

  // Завантаження команди користувача
  useEffect(() => {
    const fetchTeam = async () => {
      if (!currentUser) return;
      
      try {
        const teams = await getUserTeams(currentUser.uid);
        if (teams.length > 0 && teams[0].id) {
          setTeamId(teams[0].id);
        } else {
          setError(t('teams.noTeams'));
        }
      } catch (err) {
        setError(t('common.error'));
        console.error('Error fetching team:', err);
      }
    };

    fetchTeam();
  }, [currentUser, t]);

  // Завантаження локацій
  useEffect(() => {
    const fetchLocations = async () => {
      if (!teamId) return;
      
      try {
        setLoading(true);
        const fetchedLocations = await getTeamLocations(teamId);
        setLocations(fetchedLocations);
        setError('');
      } catch (err) {
        setError(t('locations.error.load'));
        console.error('Error loading locations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [teamId, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !teamId) return;

    try {
      setLoading(true);
      await addLocation({
        name: newLocation.name,
        address: newLocation.address,
        teamId,
      });

      // Оновлюємо список
      const updatedLocations = await getTeamLocations(teamId);
      setLocations(updatedLocations);
      
      // Очищаємо форму
      setNewLocation({ name: '', address: '' });
      setError('');
    } catch (err) {
      setError(t('locations.error.add'));
      console.error('Error adding location:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      await deleteLocation(id);
      
      // Оновлюємо список
      const updatedLocations = await getTeamLocations(teamId);
      setLocations(updatedLocations);
      setError('');
    } catch (err) {
      setError(t('locations.error.delete'));
      console.error('Error deleting location:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (!teamId) {
    return <div className="error-message">{t('teams.noTeams')}</div>;
  }

  return (
    <div className="locations">
      <h2>{t('locations.title')}</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="add-form">
        <div className="form-group">
          <label>{t('locations.name')}</label>
          <input
            type="text"
            value={newLocation.name}
            onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('locations.namePlaceholder')}
            required
          />
        </div>

        <div className="form-group">
          <label>{t('locations.address')}</label>
          <input
            type="text"
            value={newLocation.address}
            onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
            placeholder={t('locations.addressPlaceholder')}
            required
          />
        </div>

        <button type="submit" className="btn-primary">
          {t('locations.add')}
        </button>
      </form>

      <div className="locations-list">
        {locations.map(location => (
          <div key={location.id} className="location-item">
            <div className="location-info">
              <h3>{location.name}</h3>
              <p>{t('locations.addressLabel')}: {location.address}</p>
            </div>
            <button
              onClick={() => handleDelete(location.id!)}
              className="btn-delete"
            >
              {t('common.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Locations; 