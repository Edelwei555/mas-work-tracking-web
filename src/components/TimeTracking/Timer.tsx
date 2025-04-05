import { useEffect } from 'react';
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

  const handleStart = (workTypeId: string, locationId: string) => {
    dispatch(startTimer({ workTypeId, locationId }));
  };

  const handleStop = () => {
    dispatch(stopTimer());
  };

  return (
    <div className="timer">
      <div className="timer-display">{formatTime(timerState.elapsed)}</div>
      
      {!timerState.isRunning ? (
        <>
          <select
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
            disabled={timerState.isRunning}
          >
            <option value="">Вибрати вид роботи</option>
            {/* options */}
          </select>
          
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={timerState.isRunning}
          >
            <option value="">Вибрати локацію</option>
            {/* options */}
          </select>
          
          <button
            onClick={() => handleStart(selectedWorkType, selectedLocation)}
            disabled={!selectedWorkType || !selectedLocation}
            className="start-button"
          >
            Почати
          </button>
        </>
      ) : (
        <button onClick={handleStop} className="stop-button">
          Зупинити
        </button>
      )}
    </div>
  );
}; 