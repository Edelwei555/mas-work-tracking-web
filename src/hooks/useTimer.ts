import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
  workTypeId: string | null;
  locationId: string | null;
}

export const useTimer = (userId: string) => {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    startTime: null,
    elapsed: 0,
    workTypeId: null,
    locationId: null
  });
  const [worker, setWorker] = useState<Worker | null>(null);

  // Ініціалізація при завантаженні
  useEffect(() => {
    const initTimer = async () => {
      // Перевіряємо localStorage
      const savedState = localStorage.getItem(`timerState_${userId}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setTimerState(parsed);
      }

      // Перевіряємо стан на сервері
      const timerDoc = await getDoc(doc(db, 'timers', userId));
      if (timerDoc.exists()) {
        const serverState = timerDoc.data();
        if (serverState.isRunning) {
          setTimerState(serverState);
          startTimer(serverState.startTime, serverState.workTypeId, serverState.locationId);
        }
      }
    };

    initTimer();

    // Створюємо Web Worker
    const timerWorker = new Worker('/timerWorker.js');
    timerWorker.onmessage = (e) => {
      if (e.data.type === 'tick') {
        setTimerState(prev => ({
          ...prev,
          elapsed: e.data.elapsed
        }));
      }
    };
    setWorker(timerWorker);

    return () => {
      timerWorker.terminate();
    };
  }, [userId]);

  const startTimer = async (workTypeId: string, locationId: string) => {
    const startTime = Date.now();
    const newState = {
      isRunning: true,
      startTime,
      elapsed: 0,
      workTypeId,
      locationId
    };

    // Оновлюємо локальний стан
    setTimerState(newState);
    localStorage.setItem(`timerState_${userId}`, JSON.stringify(newState));

    // Оновлюємо стан на сервері
    await setDoc(doc(db, 'timers', userId), {
      ...newState,
      updatedAt: serverTimestamp()
    });

    // Запускаємо Web Worker
    worker?.postMessage({ 
      command: 'start', 
      startTime 
    });
  };

  const stopTimer = async () => {
    const endTime = Date.now();
    const duration = endTime - (timerState.startTime || 0);

    // Зупиняємо Web Worker
    worker?.postMessage({ command: 'stop' });

    // Очищаємо локальний стан
    const newState = {
      isRunning: false,
      startTime: null,
      elapsed: 0,
      workTypeId: null,
      locationId: null
    };
    setTimerState(newState);
    localStorage.setItem(`timerState_${userId}`, JSON.stringify(newState));

    // Зберігаємо запис про час
    await setDoc(doc(db, 'timeEntries', `${userId}_${endTime}`), {
      userId,
      workTypeId: timerState.workTypeId,
      locationId: timerState.locationId,
      startTime: timerState.startTime,
      endTime,
      duration,
      createdAt: serverTimestamp()
    });

    // Очищаємо активний таймер на сервері
    await setDoc(doc(db, 'timers', userId), {
      isRunning: false,
      updatedAt: serverTimestamp()
    });
  };

  return {
    isRunning: timerState.isRunning,
    elapsed: timerState.elapsed,
    startTimer,
    stopTimer
  };
}; 