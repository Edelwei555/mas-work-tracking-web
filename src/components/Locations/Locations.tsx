import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Location, getTeamLocations, addLocation, updateLocation, deleteLocation } from '../../services/locations';
import { getUserTeams, Team } from '../../services/teams';
import './Locations.css';

interface LocationFormData {
  name: string;
  description: string;
  teamId: string;
}

const Locations: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [formData, setFormData] = useState<LocationFormData>({ 
    name: '', 
    description: '', 
    teamId: '' 
  });

  // Завантаження команд
  useEffect(() => {
    const fetchTeams = async () => {
      if (!currentUser) return;

      try {
        const fetchedTeams = await getUserTeams(currentUser.uid);
        setTeams(fetchedTeams);
        
        if (fetchedTeams.length > 0 && fetchedTeams[0].id) {
          const teamId = fetchedTeams[0].id;
          setSelectedTeamId(teamId);
          setFormData(prev => ({ ...prev, teamId }));
        }
      } catch (err) {
        setError(t('common.error'));
        console.error('Error fetching teams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [currentUser, t]);

  // Завантаження локацій при зміні вибраної команди
  useEffect(() => {
    const fetchLocations = async () => {
      if (!selectedTeamId) return;

      try {
        setLoading(true);
        const fetchedLocations = await getTeamLocations(selectedTeamId);
        setLocations(fetchedLocations);
        setError('');
      } catch (err) {
        setError(t('common.error'));
        console.error('Error fetching locations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [selectedTeamId, t]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setFormData(prev => ({ ...prev, teamId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !formData.teamId) return;

    try {
      if (editingId) {
        await updateLocation(editingId, {
          ...formData,
          createdBy: currentUser.uid
        });
      } else {
        await addLocation({
          ...formData,
          createdBy: currentUser.uid
        });
      }

      const updatedLocations = await getTeamLocations(formData.teamId);
      setLocations(updatedLocations);
      resetForm();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error saving location:', err);
    }
  };

  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      description: location.description || '',
      teamId: location.teamId
    });
    setEditingId(location.id || null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string, teamId: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteLocation(id);
      const updatedLocations = await getTeamLocations(teamId);
      setLocations(updatedLocations);
    } catch (err) {
      setError(t('common.error'));
      console.error('Error deleting location:', err);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', teamId: selectedTeamId });
    setEditingId(null);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (teams.length === 0) {
    return <div className="error-message">{t('teams.noTeams')}</div>;
  }

  return (
    <div className="locations">
      <h2>{t('locations.title')}</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="teamId">{t('teams.select')}</label>
        <select
          id="teamId"
          value={selectedTeamId}
          onChange={(e) => handleTeamChange(e.target.value)}
        >
          <option value="">{t('teams.selectTeam')}</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      {selectedTeamId && (
        <>
          <form onSubmit={handleSubmit} className="location-form">
            <div className="form-group">
              <label htmlFor="name">{t('locations.name')}</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">{t('locations.description')}</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn-primary">
                {isEditing ? t('common.save') : t('locations.add')}
              </button>
              {isEditing && (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </form>

          <div className="locations-list">
            {locations.map(location => (
              <div key={location.id} className="location-item">
                <div className="location-info">
                  <span className="name">{location.name}</span>
                  {location.description && (
                    <span className="description">{location.description}</span>
                  )}
                </div>
                <div className="location-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(location)}
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => location.id && handleDelete(location.id, location.teamId)}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Locations; 