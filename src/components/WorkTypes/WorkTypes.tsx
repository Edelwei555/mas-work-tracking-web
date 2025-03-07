import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes, addWorkType, deleteWorkType } from '../../services/workTypes';
import { getUserTeams } from '../../services/teams';
import './WorkTypes.css';

const WorkTypes: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [newWorkType, setNewWorkType] = useState({
    name: ''
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

  // Завантаження видів робіт
  useEffect(() => {
    const fetchWorkTypes = async () => {
      if (!teamId) return;
      
      try {
        setLoading(true);
        const fetchedWorkTypes = await getTeamWorkTypes(teamId);
        setWorkTypes(fetchedWorkTypes);
        setError('');
      } catch (err) {
        setError(t('workTypes.error.load'));
        console.error('Error loading work types:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkTypes();
  }, [teamId, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !teamId) return;

    try {
      setLoading(true);
      await addWorkType({
        name: newWorkType.name,
        teamId,
        createdBy: currentUser.uid
      });

      // Оновлюємо список
      const updatedWorkTypes = await getTeamWorkTypes(teamId);
      setWorkTypes(updatedWorkTypes);
      
      // Очищаємо форму
      setNewWorkType({ name: '' });
      setError('');
    } catch (err) {
      setError(t('workTypes.error.add'));
      console.error('Error adding work type:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      await deleteWorkType(id);
      
      // Оновлюємо список
      const updatedWorkTypes = await getTeamWorkTypes(teamId);
      setWorkTypes(updatedWorkTypes);
      setError('');
    } catch (err) {
      setError(t('workTypes.error.delete'));
      console.error('Error deleting work type:', err);
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
    <div className="work-types">
      <h2>{t('workTypes.title')}</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="add-form">
        <div className="form-group">
          <label>{t('workTypes.name')}</label>
          <input
            type="text"
            value={newWorkType.name}
            onChange={(e) => setNewWorkType(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('workTypes.namePlaceholder')}
            required
          />
        </div>

        <button type="submit" className="btn-primary">
          {t('workTypes.add')}
        </button>
      </form>

      <div className="work-types-list">
        {workTypes.map(workType => (
          <div key={workType.id} className="work-type-item">
            <div className="work-type-info">
              <h3>{workType.name}</h3>
            </div>
            <button
              onClick={() => handleDelete(workType.id!)}
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

export default WorkTypes; 