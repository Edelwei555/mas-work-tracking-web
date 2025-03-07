import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes } from '../../services/workTypes';
import { Location, getTeamLocations } from '../../services/locations';
import { TimeEntry, getTeamTimeEntries } from '../../services/timeTracking';
import { getUserTeams, getTeamMembers, User } from '../../services/teams';
import { exportToExcel, exportToPDF, exportToCSV } from '../../services/export';
import './Reports.css';

interface ReportFilters {
  startDate: Date;
  endDate: Date;
  locationIds: string[];
  workTypeIds: string[];
  userIds: string[];
}

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [teamId, setTeamId] = useState<string>('');
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [allTimeEntries, setAllTimeEntries] = useState<TimeEntry[]>([]); // Всі записи команди
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([]); // Відфільтровані записи для відображення
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    locationIds: [],
    workTypeIds: [],
    userIds: []
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

  // Завантаження даних після отримання ID команди
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !teamId) return;
      
      try {
        setLoading(true);
        
        // Отримуємо види робіт, локації та учасників команди
        const [fetchedWorkTypes, fetchedLocations, fetchedMembers] = await Promise.all([
          getTeamWorkTypes(teamId),
          getTeamLocations(teamId),
          getTeamMembers(teamId)
        ]);
        
        setWorkTypes(fetchedWorkTypes);
        setLocations(fetchedLocations);
        setTeamMembers(fetchedMembers);
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
      setLoading(true);
      const entries = await getTeamTimeEntries(teamId, filters.startDate, filters.endDate);
      setAllTimeEntries(entries);
      
      // Фільтруємо записи для відображення
      let filtered = [...entries];
      
      if (filters.locationIds.length > 0) {
        filtered = filtered.filter(entry => filters.locationIds.includes(entry.locationId));
      }
      
      if (filters.workTypeIds.length > 0) {
        filtered = filtered.filter(entry => filters.workTypeIds.includes(entry.workTypeId));
      }

      if (filters.userIds.length > 0) {
        filtered = filtered.filter(entry => filters.userIds.includes(entry.userId));
      }
      
      setFilteredEntries(filtered);
      setError('');
    } catch (err) {
      setError(t('reports.error'));
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: new Date(value)
    }));
  };

  const handleCheckboxChange = (type: 'locationIds' | 'workTypeIds' | 'userIds', id: string) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [type]: prev[type].includes(id)
          ? prev[type].filter(item => item !== id)
          : [...prev[type], id]
      };

      // Перефільтровуємо існуючі записи
      let filtered = [...allTimeEntries];
      
      if (newFilters.locationIds.length > 0) {
        filtered = filtered.filter(entry => newFilters.locationIds.includes(entry.locationId));
      }
      
      if (newFilters.workTypeIds.length > 0) {
        filtered = filtered.filter(entry => newFilters.workTypeIds.includes(entry.workTypeId));
      }

      if (newFilters.userIds.length > 0) {
        filtered = filtered.filter(entry => newFilters.userIds.includes(entry.userId));
      }
      
      setFilteredEntries(filtered);
      return newFilters;
    });
  };

  const handleSelectAll = (type: 'locationIds' | 'workTypeIds' | 'userIds') => {
    setFilters(prev => {
      const allIds = type === 'locationIds' 
        ? locations.map(l => l.id!)
        : type === 'workTypeIds'
          ? workTypes.map(w => w.id!)
          : teamMembers.map(m => m.id);

      const newFilters = {
        ...prev,
        [type]: prev[type].length === allIds.length ? [] : allIds
      };

      // Перефільтровуємо існуючі записи
      let filtered = [...allTimeEntries];
      
      if (newFilters.locationIds.length > 0) {
        filtered = filtered.filter(entry => newFilters.locationIds.includes(entry.locationId));
      }
      
      if (newFilters.workTypeIds.length > 0) {
        filtered = filtered.filter(entry => newFilters.workTypeIds.includes(entry.workTypeId));
      }

      if (newFilters.userIds.length > 0) {
        filtered = filtered.filter(entry => newFilters.userIds.includes(entry.userId));
      }
      
      setFilteredEntries(filtered);
      return newFilters;
    });
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    if (!teamId || allTimeEntries.length === 0) return;

    try {
      switch (format) {
        case 'excel':
          await exportToExcel(allTimeEntries, locations, workTypes, teamMembers);
          break;
        case 'pdf':
          await exportToPDF(allTimeEntries, locations, workTypes, teamMembers);
          break;
        case 'csv':
          await exportToCSV(allTimeEntries, locations, workTypes, teamMembers);
          break;
      }
    } catch (err) {
      setError(t('reports.exportError'));
      console.error('Error exporting report:', err);
    }
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

        <div className="form-group filter-group">
          <label>
            {t('reports.columns.worker')}
            <button 
              type="button" 
              className="select-all-btn"
              onClick={() => handleSelectAll('userIds')}
            >
              {filters.userIds.length === teamMembers.length ? t('common.deselectAll') : t('common.selectAll')}
            </button>
          </label>
          <div className="checkbox-list">
            {teamMembers.map(member => (
              <label key={member.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.userIds.includes(member.id)}
                  onChange={() => handleCheckboxChange('userIds', member.id)}
                />
                {member.displayName || member.email}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group filter-group">
          <label>
            {t('locations.title')}
            <button 
              type="button" 
              className="select-all-btn"
              onClick={() => handleSelectAll('locationIds')}
            >
              {filters.locationIds.length === locations.length ? t('common.deselectAll') : t('common.selectAll')}
            </button>
          </label>
          <div className="checkbox-list">
            {locations.map(location => (
              <label key={location.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.locationIds.includes(location.id!)}
                  onChange={() => handleCheckboxChange('locationIds', location.id!)}
                />
                {location.name}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group filter-group">
          <label>
            {t('workTypes.title')}
            <button 
              type="button" 
              className="select-all-btn"
              onClick={() => handleSelectAll('workTypeIds')}
            >
              {filters.workTypeIds.length === workTypes.length ? t('common.deselectAll') : t('common.selectAll')}
            </button>
          </label>
          <div className="checkbox-list">
            {workTypes.map(workType => (
              <label key={workType.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.workTypeIds.includes(workType.id!)}
                  onChange={() => handleCheckboxChange('workTypeIds', workType.id!)}
                />
                {workType.name}
              </label>
            ))}
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

      {filteredEntries.length > 0 ? (
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
              {filteredEntries.map(entry => {
                const member = teamMembers.find(m => m.id === entry.userId);
                const location = locations.find(l => l.id === entry.locationId);
                const workType = workTypes.find(w => w.id === entry.workTypeId);
                
                return (
                  <tr key={entry.id}>
                    <td>{entry.startTime.toLocaleDateString()}</td>
                    <td>{member?.displayName || member?.email}</td>
                    <td>{location?.name}</td>
                    <td>{workType?.name}</td>
                    <td>{Math.round((entry.endTime!.getTime() - entry.startTime.getTime()) / 1000 / 60)} хв</td>
                    <td>{entry.workAmount}</td>
                  </tr>
                );
              })}
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
          disabled={allTimeEntries.length === 0}
        >
          {t('reports.exportOptions.excel')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleExport('pdf')}
          disabled={allTimeEntries.length === 0}
        >
          {t('reports.exportOptions.pdf')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => handleExport('csv')}
          disabled={allTimeEntries.length === 0}
        >
          {t('reports.exportOptions.csv')}
        </button>
      </div>
    </div>
  );
};

export default Reports; 