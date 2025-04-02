import { useState } from 'react';
import { useTimer } from '../../contexts/TimerContext';

export const Timer = () => {
  const { isRunning, elapsed, startTimer, stopTimer } = useTimer();
  const [selectedWorkType, setSelectedWorkType] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (selectedWorkType && selectedLocation) {
      startTimer(selectedWorkType, selectedLocation);
    }
  };

  return (
    <div className="timer">
      <div className="timer-display">
        {formatTime(elapsed)}
      </div>
      
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
        <button onClick={stopTimer} className="stop-button">
          Зупинити
        </button>
      )}
    </div>
  );
}; 