import { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
  workTypeId: string | null;
  locationId: string | null;
}

export const useTimer = () => {
  const { currentUser } = useAuth();
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsed: 0,
    workTypeId: null,
    locationId: null
  });

  // Підписка на зміни в Firestore
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

  // Оновлення elapsed кожну секунду
  useEffect(() => {
    if (!timerState.isRunning) return;

    const interval = setInterval(() => {
      setTimerState(prev => ({
        ...prev,
        elapsed: prev.elapsed + 1000
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning]);

  // Синхронізація з сервером кожні 5 секунд
  useEffect(() => {
    if (!timerState.isRunning || !currentUser) return;

    const interval = setInterval(async () => {
      const timerRef = doc(db, 'timers', currentUser.uid);
      await updateDoc(timerRef, {
        elapsed: timerState.elapsed,
        isRunning: timerState.isRunning,
        workTypeId: timerState.workTypeId,
        locationId: timerState.locationId
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [timerState, currentUser]);

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
    await updateDoc(timerRef, newState);
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

  return {
    timerState,
    startTimer,
    stopTimer
  };
}; 