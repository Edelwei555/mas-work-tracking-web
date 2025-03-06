import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Location, getUserLocations, addLocation, updateLocation, deleteLocation } from '../../services/locations';
import './Locations.css';

interface LocationFormData {
  name: string;
  description: string;
}

const Locations: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({ name: '', description: '' });

  useEffect(() => {
    fetchLocations();
  }, [currentUser]);

  const fetchLocations = async () => {
    if (!currentUser) return;

    try {
      const fetchedLocations = await getUserLocations(currentUser.uid);
      setLocations(fetchedLocations);
    } catch (err) {
      setError(t('common.error'));
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      if (editingId) {
        await updateLocation(editingId, {
          ...formData,
          userId: currentUser.uid
        });
      } else {
        await addLocation({
          ...formData,
          userId: currentUser.uid
        });
      }

      await fetchLocations();
      resetForm();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error saving location:', err);
    }
  };

  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      description: location.description || ''
    });
    setEditingId(location.id || null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteLocation(id);
      await fetchLocations();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error deleting location:', err);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="locations">
      <h2>{t('locations.title')}</h2>
      {error && <div className="error-message">{error}</div>}

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
                onClick={() => location.id && handleDelete(location.id)}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Locations; 