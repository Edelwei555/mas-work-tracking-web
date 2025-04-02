import { useState } from 'react';
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
  const { isRunning, elapsed } = useSelector((state: RootState) => state.timer);
  const [selectedWorkType, setSelectedWorkType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Використовуємо хук для синхронізації
  useTimerSync();

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!currentUser || !selectedWorkType || !selectedLocation) return;

    dispatch(startTimer({ workTypeId: selectedWorkType, locationId: selectedLocation }));

    await setDoc(doc(db, 'timers', currentUser.uid), {
      isRunning: true,
      startTime: Date.now(),
      workTypeId: selectedWorkType,
      locationId: selectedLocation,
      updatedAt: serverTimestamp()
    });
  };

  const handleStop = async () => {
    if (!currentUser) return;

    dispatch(stopTimer());

    await setDoc(doc(db, 'timeEntries', `${currentUser.uid}_${Date.now()}`), {
      userId: currentUser.uid,
      workTypeId: selectedWorkType,
      locationId: selectedLocation,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: elapsed,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, 'timers', currentUser.uid), {
      isRunning: false,
      updatedAt: serverTimestamp()
    });

    setSelectedWorkType('');
    setSelectedLocation('');
  };

  return (
    <div className="timer">
      <div className="timer-display">{formatTime(elapsed)}</div>
      
      {!isRunning ? (
        <>
          <select
            value={selectedWorkType}
            onChange={(e) => setSelectedWorkType(e.target.value)}
            disabled={isRunning}
          >
            <option value="">Вибрати вид роботи</option>
            {/* options */}
          </select>
          
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            disabled={isRunning}
          >
            <option value="">Вибрати локацію</option>
            {/* options */}
          </select>
          
          <button
            onClick={handleStart}
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