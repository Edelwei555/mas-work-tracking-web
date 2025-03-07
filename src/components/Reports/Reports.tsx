import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes } from '../../services/workTypes';
import { Location, getTeamLocations } from '../../services/locations';
import { TimeEntry, getTeamTimeEntries } from '../../services/timeTracking';
import { getUserTeams } from '../../services/teams';
import './Reports.css';

interface ReportFilters {
  startDate: Date;
  endDate: Date;
}

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [teamId, setTeamId] = useState<string>('');
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
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

  // Завантаження даних після отримання ID команди
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !teamId) return;
      
      try {
        setLoading(true);
        
        // Отримуємо види робіт та локації
        const [fetchedWorkTypes, fetchedLocations] = await Promise.all([
          getTeamWorkTypes(teamId),
          getTeamLocations(teamId)
        ]);
        
        setWorkTypes(fetchedWorkTypes);
        setLocations(fetchedLocations);
        setError('');
      } catch (err) {
        setError(t('common.error'));
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, teamId, t]);

  const handleGenerateReport = async () => {
    if (!teamId) return;

    try {
      const entries = await getTeamTimeEntries(teamId, filters.startDate, filters.endDate);
      setTimeEntries(entries);
    } catch (err) {
      setError(t('reports.error'));
      console.error('Error generating report:', err);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: new Date(value)
    }));
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    // TODO: Додати логіку експорту
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (!teamId) {
    return <div className="error-message">{t('teams.noTeams')}</div>;
  }

  return (
    <div className="reports">
      <h2>{t('reports.title')}</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="reports-form">
        <div className="form-group">
          <label>{t('reports.dateRange')}</label>
          <div className="date-range">
            <input 
              type="date"
              name="startDate"
              value={filters.startDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              placeholder={t('reports.startDate')}
            />
            <input 
              type="date"
              name="endDate"
              value={filters.endDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              placeholder={t('reports.endDate')}
            />
          </div>
        </div>

        <div className="form-group">
          <button 
            className="btn-primary"
            onClick={handleGenerateReport}
          >
            {t('reports.generate')}
          </button>
        </div>
      </div>

      {timeEntries.length > 0 ? (
        <div className="report-results">
          <table>
            <thead>
              <tr>
                <th>{t('reports.columns.date')}</th>
                <th>{t('reports.columns.worker')}</th>
                <th>{t('reports.columns.location')}</th>
                <th>{t('reports.columns.workType')}</th>
                <th>{t('reports.columns.timeSpent')}</th>
                <th>{t('reports.columns.workAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map(entry => (
                <tr key={entry.id}>
                  <td>{entry.startTime.toLocaleDateString()}</td>
                  <td>{entry.userId}</td>
                  <td>{locations.find(l => l.id === entry.locationId)?.name}</td>
                  <td>{workTypes.find(w => w.id === entry.workTypeId)?.name}</td>
                  <td>{Math.round((entry.endTime!.getTime() - entry.startTime.getTime()) / 1000 / 60)} хв</td>
                  <td>{entry.workAmount} {workTypes.find(w => w.id === entry.workTypeId)?.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-data">{t('reports.noData')}</div>
      )}

      <div className="export-buttons">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleExport('excel')}
          disabled={timeEntries.length === 0}
        >
          {t('reports.exportOptions.excel')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleExport('pdf')}
          disabled={timeEntries.length === 0}
        >
          {t('reports.exportOptions.pdf')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleExport('csv')}
          disabled={timeEntries.length === 0}
        >
          {t('reports.exportOptions.csv')}
        </button>
      </div>
    </div>
  );
};

export default Reports; 