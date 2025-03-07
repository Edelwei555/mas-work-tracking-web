import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes, addWorkType, updateWorkType, deleteWorkType } from '../../services/workTypes';
import { getUserTeams } from '../../services/teams';
import './WorkTypes.css';

interface WorkTypeFormData {
  name: string;
}

const WorkTypes: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkTypeFormData>({ 
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
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [currentUser, t]);

  // Завантаження видів робіт після отримання ID команди
  useEffect(() => {
    const fetchWorkTypes = async () => {
      if (!teamId) return;

      try {
        setLoading(true);
        const fetchedWorkTypes = await getTeamWorkTypes(teamId);
        setWorkTypes(fetchedWorkTypes);
        setError('');
      } catch (err) {
        setError(t('common.error'));
        console.error('Error fetching work types:', err);
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
      if (editingId) {
        await updateWorkType(editingId, {
          ...formData,
          teamId,
          createdBy: currentUser.uid
        });
      } else {
        await addWorkType({
          ...formData,
          teamId,
          createdBy: currentUser.uid
        });
      }

      const updatedWorkTypes = await getTeamWorkTypes(teamId);
      setWorkTypes(updatedWorkTypes);
      resetForm();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error saving work type:', err);
    }
  };

  const handleEdit = (workType: WorkType) => {
    setFormData({
      name: workType.name
    });
    setEditingId(workType.id || null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteWorkType(id);
      const updatedWorkTypes = await getTeamWorkTypes(teamId);
      setWorkTypes(updatedWorkTypes);
    } catch (err) {
      setError(t('common.error'));
      console.error('Error deleting work type:', err);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingId(null);
    setIsEditing(false);
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

      <form onSubmit={handleSubmit} className="work-type-form">
        <div className="form-group">
          <label htmlFor="name">{t('workTypes.name')}</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-buttons">
          <button type="submit" className="btn-primary">
            {isEditing ? t('common.save') : t('workTypes.add')}
          </button>
          {isEditing && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="work-types-list">
        {workTypes.map(workType => (
          <div key={workType.id} className="work-type-item">
            <div className="work-type-info">
              <span className="name">{workType.name}</span>
            </div>
            <div className="work-type-actions">
              <button
                className="btn-edit"
                onClick={() => handleEdit(workType)}
              >
                {t('common.edit')}
              </button>
              <button
                className="btn-delete"
                onClick={() => workType.id && handleDelete(workType.id)}
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

export default WorkTypes; 