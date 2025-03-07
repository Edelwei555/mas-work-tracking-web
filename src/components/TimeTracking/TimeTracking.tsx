import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes } from '../../services/workTypes';
import { Location, getTeamLocations } from '../../services/locations';
import { TimeEntry, saveTimeEntry, getCurrentTimeEntry } from '../../services/timeTracking';
import { Team, getUserTeams } from '../../services/teams';
import './TimeTracking.css';

const TimeTracking: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [timeEntry, setTimeEntry] = useState<Partial<TimeEntry> | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [selectedWorkType, setSelectedWorkType] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [workAmount, setWorkAmount] = useState<string>('');
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Завантаження команд
  useEffect(() => {
    const fetchTeams = async () => {
      if (!currentUser) return;
      
      try {
        const fetchedTeams = await getUserTeams(currentUser.uid);
        setTeams(fetchedTeams);
        
        if (fetchedTeams.length > 0 && fetchedTeams[0].id) {
          setSelectedTeam(fetchedTeams[0].id);
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

  // Завантаження даних при зміні команди
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !selectedTeam) return;
      
      try {
        setLoading(true);
        
        // Отримуємо поточний запис часу
        const currentEntry = await getCurrentTimeEntry(currentUser.uid, selectedTeam);
        if (currentEntry) {
          setTimeEntry(currentEntry);
          setSelectedWorkType(currentEntry.workTypeId);
          setSelectedLocation(currentEntry.locationId);
        }

        // Отримуємо види робіт та локації
        const [fetchedWorkTypes, fetchedLocations] = await Promise.all([
          getTeamWorkTypes(selectedTeam),
          getTeamLocations(selectedTeam)
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
  }, [currentUser, selectedTeam, t]);

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
    if (!selectedWorkType || !selectedLocation || !currentUser || !selectedTeam) return;

    setTimeEntry({
      userId: currentUser.uid,
      teamId: selectedTeam,
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
    if (!timeEntry || !workAmount || !currentUser || !selectedTeam) return;

    try {
      await saveTimeEntry({
        ...timeEntry as TimeEntry,
        teamId: selectedTeam,
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

  if (teams.length === 0) {
    return <div className="error-message">{t('teams.noTeams')}</div>;
  }

  return (
    <div className="time-tracking">
      <h2>{t('timeTracking.title')}</h2>
      
      <div className="time-tracking-form">
        <div className="form-group">
          <label>{t('teams.select')}</label>
          <select 
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            disabled={!!timeEntry}
          >
            <option value="">{t('teams.selectTeam')}</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        {selectedTeam && (
          <>
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
                    step="0.1"
                  />
                  <span className="unit">
                    {workTypes.find(t => t.id === selectedWorkType)?.unit}
                  </span>
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
          </>
        )}
      </div>
    </div>
  );
};

export default TimeTracking; 