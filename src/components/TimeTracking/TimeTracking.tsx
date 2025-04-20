import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes } from '../../services/workTypes';
import { Location, getTeamLocations } from '../../services/locations';
import { saveTimeEntry } from '../../services/timeTracking';
import { getUserTeams } from '../../services/teams';
import { useSelector } from 'react-redux';
import { 
  startTimer, 
  pauseTimer, 
  resumeTimer, 
  stopTimer, 
  fetchCurrentTimer,
  updateElapsedTime,
  resetTimer
} from '../../store/timerSlice';
import { AppDispatch, RootState } from '../../store';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import './TimeTracking.css';
import { TimeEntry } from '../../types';
import { getErrorMessage } from '../../utils/errors';

const TimeTracking: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const dispatch = useAppDispatch();
  
  const { currentEntry, elapsedTime, isLoading, error: timerError } = useAppSelector(
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
  const [isSaving, setIsSaving] = useState(false);

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
        console.error('Error fetching team:', err);
        setError(t('teams.error'));
      }
    };

    fetchTeam();
  }, [currentUser, t]);

  // Завантаження списків при зміні teamId
  useEffect(() => {
    if (!teamId) return;

    const loadLists = async () => {
      try {
        setLoading(true);
        const [fetchedWorkTypes, fetchedLocations] = await Promise.all([
          getTeamWorkTypes(teamId),
          getTeamLocations(teamId)
        ]);
        
        setWorkTypes(fetchedWorkTypes);
        setLocations(fetchedLocations);
        setError('');
      } catch (err) {
        console.error('Error loading lists:', err);
        setError(t('timeTracking.error'));
      } finally {
        setLoading(false);
      }
    };

    loadLists();
  }, [teamId, t]);

  // Завантаження даних після отримання ID команди
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !teamId) return;
      
      try {
        setLoading(true);
        
        // Отримуємо поточний запис часу
        await dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId })).unwrap();
        
        // Завантажуємо списки
        const [fetchedWorkTypes, fetchedLocations] = await Promise.all([
          getTeamWorkTypes(teamId),
          getTeamLocations(teamId)
        ]);
        
        setWorkTypes(fetchedWorkTypes);
        setLocations(fetchedLocations);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(t('timeTracking.error'));
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    fetchData();
  }, [currentUser, teamId, dispatch, t]);

  // Періодична синхронізація стану таймера
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;

    if (currentUser && teamId) {
      // Синхронізуємо кожні 5 секунд для активного таймера
      syncInterval = setInterval(() => {
        if (currentEntry?.isRunning) {
          dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId }));
        }
      }, 5000);
    }

    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [currentUser, teamId, dispatch, currentEntry]);

  // Оновлення таймера
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (currentEntry?.isRunning && currentEntry?.startTime) {
      interval = setInterval(() => {
        try {
          const now = new Date();
          const start = new Date(currentEntry.startTime);
          const pausedTime = currentEntry.pausedTime || 0;
          const elapsed = Math.max(0, now.getTime() - start.getTime() - pausedTime);
          
          // Перевіряємо чи обчислений час є коректним числом
          if (!isNaN(elapsed)) {
            dispatch(updateElapsedTime(elapsed));
          }
        } catch (error) {
          console.error('Error updating elapsed time:', error);
        }
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentEntry, dispatch]);

  // Автоматичне приховування повідомлення про успіх
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (success) {
      timeout = setTimeout(() => {
        setSuccess('');
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [success]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!currentUser) return;
    
    try {
      setError('');
      setSuccess('');

      if (!selectedWorkType || !selectedLocation) {
        setError(t('timeTracking.selectRequired'));
        return;
      }

      const now = new Date();
      const timeEntry: Omit<TimeEntry, 'createdAt' | 'lastUpdate' | 'id'> = {
        userId: currentUser.uid,
        teamId,
        workTypeId: selectedWorkType,
        locationId: selectedLocation,
        startTime: now,
        endTime: now,
        pausedTime: 0,
        workAmount: 0,
        isRunning: true,
        duration: 0,
        lastPauseTime: null
      };

      await dispatch(startTimer(timeEntry)).unwrap();
      setSuccess(t('timeTracking.started'));
    } catch (err) {
      console.error('Error starting timer:', err);
      setError(getErrorMessage(err));
    }
  };

  const handlePause = async () => {
    if (!currentEntry) return;

    try {
      setError('');
      await dispatch(pauseTimer(currentEntry)).unwrap();
      setSuccess(t('timeTracking.paused'));
    } catch (err) {
      console.error('Error pausing timer:', err);
      setError(t('timeTracking.error'));
    }
  };

  const handleResume = async () => {
    if (!currentEntry) return;

    try {
      setError('');
      await dispatch(resumeTimer(currentEntry)).unwrap();
      setSuccess(t('timeTracking.resumed'));
    } catch (err) {
      console.error('Error resuming timer:', err);
      setError(t('timeTracking.error'));
    }
  };

  const handleStop = async () => {
    if (!currentEntry || !currentUser) return;

    try {
      setError('');
      await dispatch(stopTimer(currentEntry)).unwrap();
      setSuccess(t('timeTracking.stopped'));
      
      // Додаємо синхронізацію після зупинки
      setTimeout(() => {
        dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId }));
      }, 1000);
    } catch (err) {
      console.error('Error stopping timer:', err);
      setError(t('timeTracking.error'));
    }
  };

  const handleSave = async () => {
    if (!currentEntry || !currentUser) return;
    
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const updatedEntry: Omit<TimeEntry, 'createdAt' | 'lastUpdate' | 'id'> = {
        ...currentEntry,
        workAmount: parseFloat(workAmount),
        isRunning: false,
        endTime: new Date(),
        duration: Math.max(0, new Date().getTime() - new Date(currentEntry.startTime).getTime() - (currentEntry.pausedTime || 0))
      };

      await saveTimeEntry(updatedEntry);
      setSuccess(t('timeTracking.saved'));
      setWorkAmount('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Показуємо поле для введення обсягу робіт, якщо таймер зупинено
  const showWorkAmountInput = currentEntry && !currentEntry.isRunning && !currentEntry.endTime;

  if (loading && !initialLoadComplete) {
    return <div className="loading">{t('common.loading')}</div>;
  }

  if (initialLoadComplete && !teamId) {
    return <div className="error-message">{t('teams.noTeams')}</div>;
  }

  return (
    <div className="time-tracking">
      <h2>{t('timeTracking.title')}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {timerError && <div className="error-message">{timerError}</div>}

      <div className="time-tracking-form">
        {!currentEntry?.isRunning && (
          <>
            <div className="form-group">
              <label>{t('timeTracking.workType')}</label>
              <select
                value={selectedWorkType}
                onChange={(e) => setSelectedWorkType(e.target.value)}
                disabled={loading || currentEntry?.isRunning}
              >
                <option value="">{t('timeTracking.selectWorkType')}</option>
                {workTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('timeTracking.location')}</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                disabled={loading || currentEntry?.isRunning}
              >
                <option value="">{t('timeTracking.selectLocation')}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="timer-display">
          {formatTime(elapsedTime)}
        </div>

        <div className="timer-controls">
          {!currentEntry?.isRunning ? (
            <button
              className="btn-primary"
              onClick={handleStart}
              disabled={loading || !selectedWorkType || !selectedLocation}
            >
              {t('timeTracking.start')}
            </button>
          ) : (
            <>
              {currentEntry.lastPauseTime ? (
                <button className="btn-warning" onClick={handleResume}>
                  {t('timeTracking.resume')}
                </button>
              ) : (
                <button className="btn-warning" onClick={handlePause}>
                  {t('timeTracking.pause')}
                </button>
              )}
              <button className="btn-danger" onClick={handleStop}>
                {t('timeTracking.stop')}
              </button>
            </>
          )}
        </div>

        {currentEntry && !currentEntry.isRunning && (
          <div className="work-amount-form">
            <div className="form-group">
              <label>{t('timeTracking.workAmount')}</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  value={workAmount}
                  onChange={(e) => setWorkAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="unit">м²</span>
              </div>
            </div>
            <button
              className="btn-success"
              onClick={handleSave}
              disabled={isSaving || !workAmount}
            >
              {t('timeTracking.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking; 