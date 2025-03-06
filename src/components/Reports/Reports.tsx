import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { ReportFilters, generateReport } from '../../services/reports';
import { Team, getUserTeams } from '../../services/teams';
import { Location, getUserLocations } from '../../services/locations';
import { WorkType, getUserWorkTypes } from '../../services/workTypes';
import { TimeEntry } from '../../services/timeTracking';
import { Timestamp } from 'firebase/firestore';
import { exportToExcel, exportToPDF, exportToCSV } from '../../services/export';
import ReportCharts from './ReportCharts';
import './Reports.css';

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');
      const [fetchedTeams, fetchedLocations, fetchedWorkTypes] = await Promise.all([
        getUserTeams(currentUser.uid),
        getUserLocations(currentUser.uid),
        getUserWorkTypes(currentUser.uid)
      ]);

      setTeams(fetchedTeams);
      setLocations(fetchedLocations);
      setWorkTypes(fetchedWorkTypes);
      await generateReportData();
    } catch (err) {
      setError(t('common.error'));
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');
      const data = await generateReport(currentUser.uid, filters);
      setTimeEntries(data);
    } catch (err) {
      setError(t('common.error'));
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value || undefined
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: new Date(value)
    }));
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateReportData();
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'csv') => {
    try {
      setError('');
      setSuccess('');
      const validLocations = locations.map(l => ({
        id: l.id || '',
        name: l.name,
        userId: l.userId
      }));
      const validWorkTypes = workTypes.map(w => ({
        id: w.id || '',
        name: w.name,
        userId: w.userId,
        unit: w.unit
      }));

      switch (format) {
        case 'excel':
          await exportToExcel(timeEntries, validLocations, validWorkTypes);
          break;
        case 'pdf':
          await exportToPDF(timeEntries, validLocations, validWorkTypes);
          break;
        case 'csv':
          await exportToCSV(timeEntries, validLocations, validWorkTypes);
          break;
      }

      setSuccess(t('reports.exportSuccess'));
    } catch (err) {
      setError(t('reports.exportError'));
      console.error('Error exporting report:', err);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  return (
    <div className="reports">
      <h2>{t('reports.title')}</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleGenerateReport} className="report-filters">
        <div className="form-group">
          <label htmlFor="startDate">{t('reports.filter.startDate')}</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={filters.startDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">{t('reports.filter.endDate')}</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={filters.endDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="teamId">{t('team.title')}</label>
          <select
            id="teamId"
            name="teamId"
            value={filters.teamId || ''}
            onChange={handleFilterChange}
          >
            <option value="">{t('common.select')}</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="locationId">{t('locations.title')}</label>
          <select
            id="locationId"
            name="locationId"
            value={filters.locationId || ''}
            onChange={handleFilterChange}
          >
            <option value="">{t('common.select')}</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="workTypeId">{t('workTypes.title')}</label>
          <select
            id="workTypeId"
            name="workTypeId"
            value={filters.workTypeId || ''}
            onChange={handleFilterChange}
          >
            <option value="">{t('common.select')}</option>
            {workTypes.map(workType => (
              <option key={workType.id} value={workType.id}>{workType.name}</option>
            ))}
          </select>
        </div>

        <div className="form-buttons">
          <button type="submit" className="btn-primary">
            {t('reports.generate')}
          </button>
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
      </form>

      {timeEntries.length > 0 ? (
        <>
          <div className="report-table">
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
                    <td>{(entry.startTime as Date).toLocaleDateString()}</td>
                    <td>{entry.userId}</td>
                    <td>{locations.find(l => l.id === entry.locationId)?.name || ''}</td>
                    <td>{workTypes.find(w => w.id === entry.workTypeId)?.name || ''}</td>
                    <td>{entry.duration || 0}</td>
                    <td>{entry.workAmount || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ReportCharts
            timeEntries={timeEntries}
            locations={locations}
            workTypes={workTypes}
          />
        </>
      ) : (
        <div className="no-data">{t('reports.noData')}</div>
      )}
    </div>
  );
};

export default Reports; 