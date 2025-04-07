import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { WorkType, getTeamWorkTypes } from '../../services/workTypes';
import { Location, getTeamLocations } from '../../services/locations';
import { TimeEntry, saveTimeEntry } from '../../services/timeTracking';
import { getUserTeams } from '../../services/teams';
import { subscribeToTimer } from '../../services/timerSync';
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

  // Періодична синхронізація стану таймера
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;

    if (currentUser && teamId) {
      // Синхронізуємо кожні 10 секунд
      syncInterval = setInterval(() => {
        dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId }));
      }, 10000);

      // Початкова синхронізація при монтуванні
      dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId }));
    }

    return () => clearInterval(syncInterval);
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

  // Підписка на зміни таймера в реальному часі
  useEffect(() => {
    if (!currentUser) return;

    // Підписуємось на зміни таймера
    const unsubscribe = subscribeToTimer(currentUser.uid, (entry) => {
      if (!entry) {
        // Якщо запис видалено, скидаємо стан
        dispatch(resetTimer());
        return;
      }

      // Якщо запис змінився і він не активний, скидаємо стан
      if (!entry.isRunning) {
        dispatch(resetTimer());
        return;
      }

      // Оновлюємо стан з Firebase
      if (entry.isRunning) {
        const now = new Date();
        const start = new Date(entry.startTime);
        const pausedTime = entry.pausedTime || 0;
        const elapsed = Math.max(0, now.getTime() - start.getTime() + pausedTime);
        
        dispatch(updateElapsedTime(elapsed));
      }
    });

    return () => unsubscribe();
  }, [currentUser, dispatch]);

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
    if (!currentEntry || !currentUser || !teamId) return;

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

      const now = new Date();
      const startTime = currentEntry.startTime ? new Date(currentEntry.startTime) : now;
      const endTime = currentEntry.endTime ? new Date(currentEntry.endTime) : now;
      const pausedTime = currentEntry.pausedTime || 0;
      
      // Розраховуємо тривалість в секундах
      const durationInSeconds = Math.floor(elapsedTime / 1000);
      
      // Спочатку оновлюємо поточний запис як неактивний
      await dispatch(stopTimer(currentEntry)).unwrap();
      
      // Потім зберігаємо остаточний запис з обсягом робіт
      const entryToSave: Omit<TimeEntry, 'createdAt' | 'lastUpdate'> = {
        id: currentEntry.id,
        userId: currentUser.uid,
        teamId: teamId,
        workTypeId: currentEntry.workTypeId,
        locationId: currentEntry.locationId,
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

      // Скидаємо стан таймера
      dispatch(resetTimer());

      // Скидаємо форму
      setWorkAmount('');
      setSelectedWorkType('');
      setSelectedLocation('');

      // Запускаємо синхронізацію для всіх пристроїв
      // Робимо це декілька разів з інтервалом, щоб гарантувати оновлення на всіх пристроях
      const syncTimes = [0, 1000, 3000, 5000]; // Синхронізуємо відразу, через 1с, 3с і 5с
      syncTimes.forEach(delay => {
        setTimeout(() => {
          dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId }));
        }, delay);
      });

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
      
      {loading && !initialLoadComplete ? (
        <div className="loading">{t('common.loading')}</div>
      ) : (
        <div className="time-tracking-form">
          {(error || timerError) && <div className="error-message">{error || timerError}</div>}
          {success && <div className="success-message">{success}</div>}

          {!currentEntry?.isRunning && !currentEntry?.endTime && (
            <>
              <div className="form-group">
                <label>{t('workTypes.title')}</label>
                <select 
                  value={selectedWorkType} 
                  onChange={(e) => setSelectedWorkType(e.target.value)}
                  disabled={isLoading}
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
                <label>{t('locations.title')}</label>
                <select 
                  value={selectedLocation} 
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  disabled={isLoading}
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
            {!currentEntry?.isRunning && !currentEntry?.endTime && (
              <button 
                onClick={handleStart}
                disabled={!selectedWorkType || !selectedLocation || isLoading}
                className="btn-primary"
              >
                {t('timeTracking.start')}
              </button>
            )}

            {currentEntry?.isRunning && (
              <>
                <button 
                  onClick={handlePause} 
                  disabled={isLoading}
                  className="btn-warning"
                >
                  {t('timeTracking.pause')}
                </button>
                <button 
                  onClick={handleStop} 
                  disabled={isLoading}
                  className="btn-danger"
                >
                  {t('timeTracking.stop')}
                </button>
              </>
            )}

            {currentEntry && !currentEntry.isRunning && !currentEntry.endTime && (
              <>
                <button 
                  onClick={handleResume} 
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {t('timeTracking.resume')}
                </button>
                <button 
                  onClick={handleStop} 
                  disabled={isLoading}
                  className="btn-danger"
                >
                  {t('timeTracking.stop')}
                </button>
              </>
            )}
          </div>

          {currentEntry && !currentEntry.isRunning && !success && (
            <div className="work-amount-form">
              <div className="form-group">
                <label>{t('timeTracking.workAmount')}</label>
                <input
                  type="number"
                  value={workAmount}
                  onChange={(e) => setWorkAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!workAmount || isLoading}
                className="btn-primary"
              >
                {t('common.save')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeTracking; 