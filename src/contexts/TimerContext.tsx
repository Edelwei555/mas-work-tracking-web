import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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

  // Підписка на зміни таймера в Firestore
  useEffect(() => {
    if (!currentUser) return;

    // Підписуємося на зміни документа таймера
    const unsubscribe = onSnapshot(
      doc(db, 'timers', currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          const serverState = doc.data();
          if (serverState.isRunning) {
            const currentElapsed = Date.now() - serverState.startTime;
            setTimerState({
              isRunning: true,
              startTime: serverState.startTime,
              elapsed: currentElapsed,
              workTypeId: serverState.workTypeId,
              locationId: serverState.locationId
            });
          } else {
            setTimerState({
              isRunning: false,
              startTime: null,
              elapsed: 0,
              workTypeId: null,
              locationId: null
            });
          }
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Оновлення elapsed кожну секунду для активного таймера
  useEffect(() => {
    if (!timerState.isRunning || !timerState.startTime) return;

    const interval = setInterval(() => {
      const currentElapsed = Date.now() - timerState.startTime;
      setTimerState(prev => ({
        ...prev,
        elapsed: currentElapsed
      }));

      // Оновлюємо elapsed на сервері кожні 5 секунд
      if (currentUser && currentElapsed % 5000 < 1000) {
        setDoc(doc(db, 'timers', currentUser.uid), {
          isRunning: true,
          startTime: timerState.startTime,
          elapsed: currentElapsed,
          workTypeId: timerState.workTypeId,
          locationId: timerState.locationId,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.startTime, currentUser]);

  // Відновлення стану при завантаженні
  useEffect(() => {
    if (!currentUser) return;

    const initTimer = async () => {
      const timerDoc = await getDoc(doc(db, 'timers', currentUser.uid));
      if (timerDoc.exists()) {
        const serverState = timerDoc.data();
        if (serverState.isRunning) {
          const currentElapsed = Date.now() - serverState.startTime;
          setTimerState({
            isRunning: true,
            startTime: serverState.startTime,
            elapsed: currentElapsed,
            workTypeId: serverState.workTypeId,
            locationId: serverState.locationId
          });
        }
      }
    };

    initTimer();
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

    await setDoc(doc(db, 'timers', currentUser.uid), {
      ...newState,
      updatedAt: serverTimestamp()
    });
  };

  const stopTimer = async () => {
    if (!currentUser || !timerState.startTime) return;

    const endTime = Date.now();
    const duration = endTime - timerState.startTime;

    const newState: TimerState = {
      isRunning: false,
      startTime: null,
      elapsed: 0,
      workTypeId: null,
      locationId: null
    };

    setTimerState(newState);

    // Зберігаємо запис про час
    await setDoc(doc(db, 'timeEntries', `${currentUser.uid}_${endTime}`), {
      userId: currentUser.uid,
      workTypeId: timerState.workTypeId,
      locationId: timerState.locationId,
      startTime: timerState.startTime,
      endTime,
      duration,
      createdAt: serverTimestamp()
    });

    // Скидаємо активний таймер
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