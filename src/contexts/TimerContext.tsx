import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
  workTypeId: string | null;
  locationId: string | null;
}

interface TimerContextType {
  isRunning: boolean;
  elapsed: number;
  startTimer: (workTypeId: string, locationId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsed: 0,
    workTypeId: null,
    locationId: null
  });
  const [worker, setWorker] = useState<Worker | null>(null);

  // Ініціалізація таймера при завантаженні
  useEffect(() => {
    if (!currentUser) return;

    const initTimer = async () => {
      // Перевіряємо localStorage
      const savedState = localStorage.getItem(`timerState_${currentUser.uid}`);
      if (savedState) {
        const parsed = JSON.parse(savedState) as TimerState;
        setTimerState(parsed);

        if (parsed.isRunning && parsed.startTime) {
          // Обчислюємо пройдений час
          const elapsed = Date.now() - parsed.startTime;
          setTimerState(prev => ({ ...prev, elapsed }));
        }
      }

      // Перевіряємо стан на сервері
      const timerDoc = await getDoc(doc(db, 'timers', currentUser.uid));
      if (timerDoc.exists()) {
        const serverState = timerDoc.data();
        if (serverState.isRunning) {
          const convertedState: TimerState = {
            isRunning: true,
            startTime: serverState.startTime,
            elapsed: Date.now() - serverState.startTime,
            workTypeId: serverState.workTypeId,
            locationId: serverState.locationId
          };
          setTimerState(convertedState);
        }
      }
    };

    initTimer();

    // Створюємо Web Worker тільки якщо його ще немає
    if (!worker) {
      const timerWorker = new Worker('/timerWorker.js');
      timerWorker.onmessage = (e) => {
        if (e.data.type === 'tick') {
          setTimerState(prev => ({
            ...prev,
            elapsed: Date.now() - (prev.startTime || 0)
          }));
        }
      };
      setWorker(timerWorker);
    }

    // Встановлюємо інтервал для оновлення часу навіть без Web Worker
    const interval = setInterval(() => {
      if (timerState.isRunning && timerState.startTime) {
        setTimerState(prev => ({
          ...prev,
          elapsed: Date.now() - prev.startTime!
        }));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUser]);

  const startTimer = async (workTypeId: string, locationId: string) => {
    if (!currentUser) return;

    const startTime = Date.now();
    const newState: TimerState = {
      isRunning: true,
      startTime,
      elapsed: 0,
      workTypeId,
      locationId
    };

    setTimerState(newState);
    localStorage.setItem(`timerState_${currentUser.uid}`, JSON.stringify(newState));

    await setDoc(doc(db, 'timers', currentUser.uid), {
      ...newState,
      updatedAt: serverTimestamp()
    });

    worker?.postMessage({ command: 'start', startTime });
  };

  const stopTimer = async () => {
    if (!currentUser || !timerState.startTime) return;

    const endTime = Date.now();
    const duration = endTime - timerState.startTime;

    worker?.postMessage({ command: 'stop' });

    const newState: TimerState = {
      isRunning: false,
      startTime: null,
      elapsed: 0,
      workTypeId: null,
      locationId: null
    };

    setTimerState(newState);
    localStorage.setItem(`timerState_${currentUser.uid}`, JSON.stringify(newState));

    await setDoc(doc(db, 'timeEntries', `${currentUser.uid}_${endTime}`), {
      userId: currentUser.uid,
      workTypeId: timerState.workTypeId,
      locationId: timerState.locationId,
      startTime: timerState.startTime,
      endTime,
      duration,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, 'timers', currentUser.uid), {
      isRunning: false,
      updatedAt: serverTimestamp()
    });
  };

  return (
    <TimerContext.Provider value={{
      isRunning: timerState.isRunning,
      elapsed: timerState.elapsed,
      startTimer,
      stopTimer
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}; 