import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../contexts/AuthContext';
import { startTimer, stopTimer } from '../../store/timerSlice';
import { useTimerSync } from '../../hooks/useTimerSync';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { RootState } from '../../store/store';

export const Timer = () => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const timerState = useSelector((state: RootState) => state.timer);
  const [selectedWorkType, setSelectedWorkType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Використовуємо хук для синхронізації
  useTimerSync();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (selectedWorkType && selectedLocation) {
      dispatch(startTimer({ workTypeId: selectedWorkType, locationId: selectedLocation }));
    }
  };

  const handleStop = () => {
    dispatch(stopTimer());
  };

  return (
    <div className="timer">
      <div className="timer-display">{formatTime(timerState.elapsed)}</div>
      
      {!timerState.isRunning ? (
        <div>
          <select
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
            disabled={timerState.isRunning}
          >
            <option value="">Виберіть тип роботи</option>
            <option value="type1">Тип роботи 1</option>
            <option value="type2">Тип роботи 2</option>
          </select>
          
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={timerState.isRunning}
          >
            <option value="">Виберіть локацію</option>
            <option value="loc1">Локація 1</option>
            <option value="loc2">Локація 2</option>
          </select>
          
          <button
            onClick={handleStart}
            disabled={!selectedWorkType || !selectedLocation}
            className="start-button"
          >
            Почати
          </button>
        </div>
      ) : (
        <button onClick={handleStop} className="stop-button">
          Зупинити
        </button>
      )}
    </div>
  );
}; 