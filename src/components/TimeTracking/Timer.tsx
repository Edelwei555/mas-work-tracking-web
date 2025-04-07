import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/types';
import { startTimer, stopTimer, updateElapsedTime } from '../../store/timerSlice';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch } from '../../hooks/useAppDispatch';

export const Timer = () => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAuth();
  const { currentEntry, elapsedTime, isLoading } = useSelector((state: RootState) => state.timer);
  const [selectedWorkType, setSelectedWorkType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const teamId = localStorage.getItem('currentTeamId') || '';

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentEntry?.isRunning) {
        const now = new Date();
        const start = currentEntry.startTime ? new Date(currentEntry.startTime) : now;
        const pausedTime = currentEntry.pausedTime || 0;
        const elapsed = now.getTime() - start.getTime() + pausedTime;
        dispatch(updateElapsedTime(elapsed));
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [dispatch, currentEntry]);

  const handleStart = () => {
    if (selectedWorkType && selectedLocation && currentUser && teamId) {
      dispatch(startTimer({
        userId: currentUser.uid,
        teamId,
        workTypeId: selectedWorkType,
        locationId: selectedLocation,
        startTime: new Date(),
        endTime: new Date(),
        pausedTime: 0,
        workAmount: 0,
        isRunning: true,
        duration: 0,
        lastPauseTime: null
      }));
    }
  };

  const handleStop = () => {
    if (currentEntry) {
      dispatch(stopTimer(currentEntry));
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div>{formatTime(elapsedTime)}</div>
      {!currentEntry?.isRunning ? (
        <div>
          <select 
            value={selectedWorkType} 
            onChange={(e) => setSelectedWorkType(e.target.value)}
          >
            <option value="">Виберіть тип роботи</option>
            <option value="type1">Тип роботи 1</option>
            <option value="type2">Тип роботи 2</option>
          </select>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">Виберіть локацію</option>
            <option value="loc1">Локація 1</option>
            <option value="loc2">Локація 2</option>
          </select>
          <button 
            onClick={handleStart}
            disabled={!selectedWorkType || !selectedLocation || isLoading}
          >
            Start
          </button>
        </div>
      ) : (
        <button onClick={handleStop} disabled={isLoading}>Stop</button>
      )}
    </div>
  );
}; 