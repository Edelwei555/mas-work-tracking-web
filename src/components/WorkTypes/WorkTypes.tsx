import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getUserWorkTypes, addWorkType, updateWorkType, deleteWorkType } from '../../services/workTypes';
import './WorkTypes.css';

interface WorkTypeFormData {
  name: string;
  unit: string;
}

const WorkTypes: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkTypeFormData>({ name: '', unit: '' });

  useEffect(() => {
    fetchWorkTypes();
  }, [currentUser]);

  const fetchWorkTypes = async () => {
    if (!currentUser) return;

    try {
      const types = await getUserWorkTypes(currentUser.uid);
      setWorkTypes(types);
    } catch (err) {
      setError(t('common.error'));
      console.error('Error fetching work types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      if (editingId) {
        await updateWorkType(editingId, {
          ...formData,
          userId: currentUser.uid
        });
      } else {
        await addWorkType({
          ...formData,
          userId: currentUser.uid
        });
      }

      await fetchWorkTypes();
      resetForm();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error saving work type:', err);
    }
  };

  const handleEdit = (workType: WorkType) => {
    setFormData({ name: workType.name, unit: workType.unit });
    setEditingId(workType.id || null);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteWorkType(id);
      await fetchWorkTypes();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error deleting work type:', err);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', unit: '' });
    setEditingId(null);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
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