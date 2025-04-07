import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes } from '../../services/workTypes';
import { Location, getTeamLocations } from '../../services/locations';
import { TimeEntry, saveTimeEntry } from '../../services/timeTracking';
import { getUserTeams } from '../../services/teams';
import { useSelector } from 'react-redux';
import { 
  startTimer, 
  pauseTimer, 
  resumeTimer, 
  stopTimer, 
  fetchCurrentTimer,
  updateElapsedTime 
} from '../../store/timerSlice';
import { RootState } from '../../store/types';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import './TimeTracking.css';

const TimeTracking: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  
  const { currentEntry, elapsedTime, isLoading, error: timerError } = useSelector(
    (state: RootState) => state.timer
  );

  const [selectedWorkType, setSelectedWorkType] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [teamId, setTeamId] = useState<string>('');
  const [workAmount, setWorkAmount] = useState<string>('');
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Функція оновлення списків
  const refreshLists = async () => {
    if (!teamId) return;
    
    try {
      const [fetchedWorkTypes, fetchedLocations] = await Promise.all([
        getTeamWorkTypes(teamId),
        getTeamLocations(teamId)
      ]);
      
      setWorkTypes(fetchedWorkTypes);
      setLocations(fetchedLocations);
      setError('');
    } catch (err) {
      console.error('Error refreshing lists:', err);
    }
  };

  // Завантаження команди користувача
  useEffect(() => {
    const fetchTeam = async () => {
      if (!currentUser) return;
      
      try {
        const teams = await getUserTeams(currentUser.uid);
        if (teams.length > 0 && teams[0].id) {
          setTeamId(teams[0].id);
        }
      } catch (err) {
        console.error('Error fetching team:', err);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    fetchTeam();
  }, [currentUser]);

  // Завантаження даних після отримання ID команди
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !teamId) return;
      
      try {
        setLoading(true);
        
        // Отримуємо поточний запис часу
        await dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId })).unwrap();

        // Отримуємо види робіт та локації
        await refreshLists();
        setError('');
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchData();
    }
  }, [currentUser, teamId, dispatch]);

  // Оновлення таймера
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (currentEntry?.isRunning) {
      interval = setInterval(() => {
        const now = new Date();
        const start = currentEntry.startTime ? new Date(currentEntry.startTime) : new Date();
        const pausedTime = currentEntry.pausedTime || 0;
        const elapsed = Math.max(0, now.getTime() - start.getTime() + pausedTime);
        dispatch(updateElapsedTime(elapsed));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [currentEntry, dispatch]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!selectedWorkType || !selectedLocation || !currentUser || !teamId) return;

    try {
      await dispatch(startTimer({
        userId: currentUser.uid,
        teamId: teamId,
        workTypeId: selectedWorkType,
        locationId: selectedLocation,
        startTime: new Date(),
        endTime: new Date(),
        pausedTime: 0,
        workAmount: 0,
        isRunning: true,
        duration: 0,
        lastPauseTime: null
      })).unwrap();
    } catch (err) {
      console.error('Error starting timer:', err);
      setError(t('timeTracking.error'));
    }
  };

  const handlePause = async () => {
    if (!currentEntry) return;

    try {
      await dispatch(pauseTimer(currentEntry)).unwrap();
    } catch (err) {
      console.error('Error pausing timer:', err);
      setError(t('timeTracking.error'));
    }
  };

  const handleResume = async () => {
    if (!currentEntry) return;

    try {
      await dispatch(resumeTimer(currentEntry)).unwrap();
    } catch (err) {
      console.error('Error resuming timer:', err);
      setError(t('timeTracking.error'));
    }
  };

  const handleStop = async () => {
    if (!currentEntry) return;

    try {
      await dispatch(stopTimer(currentEntry)).unwrap();
    } catch (err) {
      console.error('Error stopping timer:', err);
      setError(t('timeTracking.error'));
    }
  };

  const handleSave = async () => {
    if (!currentEntry || !workAmount || !currentUser || !teamId) {
      console.error('Missing required fields:', {
        timeEntry: !!currentEntry,
        workAmount: !!workAmount,
        currentUser: !!currentUser,
        teamId: !!teamId
      });
      setError(t('timeTracking.missingFields'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const now = new Date();
      const startTime = currentEntry.startTime ? new Date(currentEntry.startTime) : now;
      const endTime = currentEntry.endTime ? new Date(currentEntry.endTime) : now;
      const pausedTime = currentEntry.pausedTime || 0;
      
      // Розраховуємо тривалість в секундах
      const durationInSeconds = Math.floor(elapsedTime / 1000);
      
      const entryToSave: Omit<TimeEntry, 'createdAt' | 'lastUpdate'> = {
        userId: currentUser.uid,
        teamId: teamId,
        workTypeId: selectedWorkType,
        locationId: selectedLocation,
        startTime,
        endTime,
        pausedTime,
        workAmount: parseFloat(workAmount),
        isRunning: false,
        duration: durationInSeconds,
        lastPauseTime: null
      };

      console.log('Saving time entry:', entryToSave);
      await saveTimeEntry(entryToSave);
      console.log('Time entry saved successfully');

      // Показуємо повідомлення про успіх
      setSuccess(t('timeTracking.saveSuccess'));

      // Скидаємо форму через 2 секунди
      setTimeout(() => {
        dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId }));
        setWorkAmount('');
        setSelectedWorkType('');
        setSelectedLocation('');
        setSuccess('');
      }, 2000);

    } catch (err) {
      console.error('Error saving time entry:', err);
      setError(t('timeTracking.saveError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !initialLoadComplete) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (initialLoadComplete && !teamId) {
    return <div className="error-message">{t('teams.noTeams')}</div>;
  }

  return (
    <div className="time-tracking">
      <h2>{t('timeTracking.title')}</h2>
      
      {(error || timerError) && <div className="error-message">{error || timerError}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="time-tracking-form">
        <div className="form-group">
          <label>{t('workTypes.title')}</label>
          <select
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
            onFocus={refreshLists}
            disabled={currentEntry?.isRunning}
            required
          >
            <option value="">{t('timeTracking.selectWorkType')}</option>
            {workTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t('locations.title')}</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            onFocus={refreshLists}
            disabled={currentEntry?.isRunning}
            required
          >
            <option value="">{t('timeTracking.selectLocation')}</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        <div className="timer-display">
          {formatTime(elapsedTime)}
        </div>

        <div className="timer-controls">
          {!currentEntry?.isRunning ? (
            currentEntry ? (
              <button 
                onClick={handleResume}
                disabled={isLoading}
                className="btn-resume"
              >
                {t('timeTracking.resume')}
              </button>
            ) : (
              <button 
                onClick={handleStart}
                disabled={isLoading || !selectedWorkType || !selectedLocation}
                className="btn-start"
              >
                {t('timeTracking.start')}
              </button>
            )
          ) : (
            <button 
              onClick={handlePause}
              disabled={isLoading}
              className="btn-pause"
            >
              {t('timeTracking.pause')}
            </button>
          )}

          {currentEntry?.isRunning && (
            <button 
              onClick={handleStop}
              disabled={isLoading}
              className="btn-stop"
            >
              {t('timeTracking.stop')}
            </button>
          )}
        </div>

        {currentEntry?.endTime && (
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