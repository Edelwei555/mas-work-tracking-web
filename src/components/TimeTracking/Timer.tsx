import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { startTimer, stopTimer, updateElapsed } from '../../store/timerSlice';

export const Timer = () => {
  const dispatch = useDispatch();
  const timerState = useSelector((state: RootState) => state.timer);
  const [selectedWorkType, setSelectedWorkType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (timerState.isRunning) {
        dispatch(updateElapsed());
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [dispatch, timerState.isRunning]);

  const handleStart = () => {
    if (selectedWorkType && selectedLocation) {
      dispatch(startTimer({ workTypeId: selectedWorkType, locationId: selectedLocation }));
    }
  };

  const handleStop = () => {
    dispatch(stopTimer());
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div>{formatTime(timerState.elapsed)}</div>
      {!timerState.isRunning ? (
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
            disabled={!selectedWorkType || !selectedLocation}
          >
            Start
          </button>
        </div>
      ) : (
        <button onClick={handleStop}>Stop</button>
      )}
    </div>
  );
}; 