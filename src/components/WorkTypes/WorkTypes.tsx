import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes, addWorkType, updateWorkType, deleteWorkType } from '../../services/workTypes';
import { getUserTeams, Team } from '../../services/teams';
import './WorkTypes.css';

interface WorkTypeFormData {
  name: string;
  unit: string;
  teamId: string;
}

const WorkTypes: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [formData, setFormData] = useState<WorkTypeFormData>({ 
    name: '', 
    unit: '', 
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

  // Завантаження видів робіт при зміні вибраної команди
  useEffect(() => {
    const fetchWorkTypes = async () => {
      if (!selectedTeamId) return;

      try {
        setLoading(true);
        const fetchedWorkTypes = await getTeamWorkTypes(selectedTeamId);
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
        await updateWorkType(editingId, {
          ...formData,
          createdBy: currentUser.uid
        });
      } else {
        await addWorkType({
          ...formData,
          createdBy: currentUser.uid
        });
      }

      const updatedWorkTypes = await getTeamWorkTypes(formData.teamId);
      setWorkTypes(updatedWorkTypes);
      resetForm();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error saving work type:', err);
    }
  };

  const handleEdit = (workType: WorkType) => {
    setFormData({
      name: workType.name,
      unit: workType.unit,
      teamId: workType.teamId
    });
    setEditingId(workType.id || null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string, teamId: string) => {
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
    setFormData({ name: '', unit: '', teamId: selectedTeamId });
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
    <div className="work-types">
      <h2>{t('workTypes.title')}</h2>
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

            <div className="form-group">
              <label htmlFor="unit">{t('workTypes.unit')}</label>
              <input
                type="text"
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                  <span className="unit">{workType.unit}</span>
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
                    onClick={() => workType.id && handleDelete(workType.id, workType.teamId)}
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

export default WorkTypes; 