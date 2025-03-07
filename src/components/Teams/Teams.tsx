import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Team, getUserTeams, addTeam, updateTeam, deleteTeam } from '../../services/teams';
import { Button } from '@mui/material';
import { Group } from '@mui/icons-material';
import './Teams.css';

interface TeamFormData {
  name: string;
  description: string;
}

const Teams: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TeamFormData>({ name: '', description: '' });

  useEffect(() => {
    fetchTeams();
  }, [currentUser]);

  const fetchTeams = async () => {
    if (!currentUser) return;

    try {
      const fetchedTeams = await getUserTeams(currentUser.uid);
      setTeams(fetchedTeams);
    } catch (err) {
      setError(t('common.error'));
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      console.log('Поточний користувач:', {
        uid: currentUser.uid,
        email: currentUser.email
      });

      if (editingId) {
        await updateTeam(editingId, {
          ...formData,
          userId: currentUser.uid
        });
      } else {
        const teamData = {
          ...formData,
          userId: currentUser.uid,
          adminId: currentUser.uid
        };
        console.log('Дані для створення команди:', teamData);
        await addTeam(teamData);
      }

      await fetchTeams();
      resetForm();
      setError('');
    } catch (err) {
      console.error('Error saving team:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('common.error'));
      }
    }
  };

  const handleEdit = (team: Team) => {
    setFormData({
      name: team.name,
      description: team.description || ''
    });
    setEditingId(team.id || null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteTeam(id);
      await fetchTeams();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error deleting team:', err);
    }
  };

  const handleManageMembers = (teamId: string) => {
    navigate(`/teams/${teamId}`);
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
    <div className="teams">
      <h2>{t('teams.title')}</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="team-form">
        <div className="form-group">
          <label htmlFor="name">{t('teams.name')}</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">{t('teams.description')}</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="form-buttons">
          <button type="submit" className="btn-primary">
            {isEditing ? t('common.save') : t('teams.add')}
          </button>
          {isEditing && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="teams-list">
        {teams.map(team => (
          <div key={team.id} className="team-item">
            <div className="team-info">
              <span className="name">{team.name}</span>
              {team.description && (
                <span className="description">{team.description}</span>
              )}
            </div>
            <div className="team-actions">
              <Button
                variant="contained"
                color="primary"
                startIcon={<Group />}
                onClick={() => team.id && handleManageMembers(team.id)}
              >
                {t('teams.manageMembers')}
              </Button>
              <button
                className="btn-edit"
                onClick={() => handleEdit(team)}
              >
                {t('common.edit')}
              </button>
              <button
                className="btn-delete"
                onClick={() => team.id && handleDelete(team.id)}
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

export default Teams; 