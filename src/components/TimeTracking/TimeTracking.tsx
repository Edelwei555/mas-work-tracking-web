import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes } from '../../services/workTypes';
import { Location, getTeamLocations } from '../../services/locations';
import { TimeEntry, saveTimeEntry, getCurrentTimeEntry } from '../../services/timeTracking';
import { getUserTeams } from '../../services/teams';
import './TimeTracking.css';

const TimeTracking: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [timeEntry, setTimeEntry] = useState<Partial<TimeEntry> | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [selectedWorkType, setSelectedWorkType] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [teamId, setTeamId] = useState<string>('');
  const [workAmount, setWorkAmount] = useState<string>('');
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
        
        // Отримуємо поточний запис часу
        const currentEntry = await getCurrentTimeEntry(currentUser.uid, teamId);
        if (currentEntry) {
          setTimeEntry(currentEntry);
          setSelectedWorkType(currentEntry.workTypeId);
          setSelectedLocation(currentEntry.locationId);
        }

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

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timeEntry?.isRunning) {
      interval = setInterval(() => {
        const now = new Date();
        const start = timeEntry.startTime as Date;
        const elapsed = now.getTime() - start.getTime() - (timeEntry.pausedTime || 0);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timeEntry]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!selectedWorkType || !selectedLocation || !currentUser || !teamId) return;

    setTimeEntry({
      userId: currentUser.uid,
      teamId: teamId,
      workTypeId: selectedWorkType,
      locationId: selectedLocation,
      startTime: new Date(),
      pausedTime: 0,
      isRunning: true
    });
  };

  const handlePause = () => {
    if (!timeEntry) return;

    setTimeEntry({
      ...timeEntry,
      isRunning: false,
      pausedTime: (timeEntry.pausedTime || 0) + (new Date().getTime() - (timeEntry.startTime as Date).getTime())
    });
  };

  const handleResume = () => {
    if (!timeEntry) return;

    setTimeEntry({
      ...timeEntry,
      startTime: new Date(),
      isRunning: true
    });
  };

  const handleStop = () => {
    if (!timeEntry) return;

    setTimeEntry({
      ...timeEntry,
      isRunning: false,
      endTime: new Date()
    });
  };

  const handleSave = async () => {
    if (!timeEntry || !workAmount || !currentUser || !teamId) return;

    try {
      await saveTimeEntry({
        ...timeEntry as TimeEntry,
        teamId: teamId,
        workAmount: parseFloat(workAmount)
      });

      // Скинути стан
      setTimeEntry(null);
      setElapsedTime(0);
      setWorkAmount('');
      setSelectedWorkType('');
      setSelectedLocation('');
    } catch (err) {
      setError(t('common.error'));
      console.error('Error saving time entry:', err);
    }
  };

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (!teamId) {
    return <div className="error-message">{t('teams.noTeams')}</div>;
  }

  return (
    <div className="time-tracking">
      <h2>{t('timeTracking.title')}</h2>
      
      <div className="time-tracking-form">
        <div className="form-group">
          <label>{t('workTypes.title')}</label>
          <select 
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
            disabled={!!timeEntry}
          >
            <option value="">{t('common.select')}</option>
            {workTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t('locations.title')}</label>
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={!!timeEntry}
          >
            <option value="">{t('common.select')}</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>

        <div className="timer-display">
          {formatTime(elapsedTime)}
        </div>

        <div className="timer-controls">
          {!timeEntry && (
            <button 
              className="btn-primary"
              onClick={handleStart}
              disabled={!selectedWorkType || !selectedLocation}
            >
              {t('timeTracking.start')}
            </button>
          )}

          {timeEntry && !timeEntry.endTime && (
            <>
              {timeEntry.isRunning ? (
                <button className="btn-warning" onClick={handlePause}>
                  {t('timeTracking.pause')}
                </button>
              ) : (
                <button className="btn-primary" onClick={handleResume}>
                  {t('timeTracking.resume')}
                </button>
              )}
              <button className="btn-danger" onClick={handleStop}>
                {t('timeTracking.stop')}
              </button>
            </>
          )}
        </div>

        {timeEntry?.endTime && (
          <div className="work-amount-form">
            <div className="form-group">
              <label>{t('timeTracking.workAmount')}</label>
              <input
                type="number"
                value={workAmount}
                onChange={(e) => setWorkAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
            <button 
              className="btn-success"
              onClick={handleSave}
              disabled={!workAmount}
            >
              {t('common.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking; 