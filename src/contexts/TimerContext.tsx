import { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
  workTypeId: string | null;
  locationId: string | null;
}

interface TimerContextType {
  timerState: TimerState;
  startTimer: (workTypeId: string, locationId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | null>(null);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
};

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsed: 0,
    workTypeId: null,
    locationId: null
  });

  useEffect(() => {
    if (!currentUser) return;

    const timerRef = doc(db, 'timers', currentUser.uid);
    const unsubscribe = onSnapshot(timerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTimerState({
          isRunning: data.isRunning,
          startTime: data.startTime?.toMillis() || null,
          elapsed: data.elapsed || 0,
          workTypeId: data.workTypeId,
          locationId: data.locationId
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Оновлюємо elapsed кожну секунду, якщо таймер запущений
  useEffect(() => {
    if (!timerState.isRunning || !timerState.startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const newElapsed = timerState.elapsed + (now - timerState.startTime);
      setTimerState(prev => ({
        ...prev,
        startTime: now,
        elapsed: newElapsed
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.startTime]);

  // Синхронізуємо з сервером кожні 5 секунд
  useEffect(() => {
    if (!timerState.isRunning || !currentUser) return;

    const interval = setInterval(async () => {
      const timerRef = doc(db, 'timers', currentUser.uid);
      await updateDoc(timerRef, {
        elapsed: timerState.elapsed,
        startTime: new Date()
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.elapsed, currentUser]);

  const startTimer = async (workTypeId: string, locationId: string) => {
    if (!currentUser) return;

    const newState = {
      isRunning: true,
      startTime: Date.now(),
      elapsed: timerState.elapsed,
      workTypeId,
      locationId
    };

    const timerRef = doc(db, 'timers', currentUser.uid);
    await updateDoc(timerRef, {
      ...newState,
      startTime: new Date()
    });

    setTimerState(newState);
  };

  const stopTimer = async () => {
    if (!currentUser) return;

    const newState = {
      ...timerState,
      isRunning: false,
      startTime: null
    };

    const timerRef = doc(db, 'timers', currentUser.uid);
    await updateDoc(timerRef, newState);

    setTimerState(newState);
  };

  return (
    <TimerContext.Provider value={{ timerState, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
}; 