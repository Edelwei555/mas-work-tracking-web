import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { syncTimerState, updateElapsed } from '../store/timerSlice';
import { RootState } from '../store/store';
import { Timestamp } from 'firebase/firestore';

export const useTimerSync = () => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const timerState = useSelector((state: RootState) => state.timer);

  useEffect(() => {
    if (!currentUser) return;

    // Підписка на зміни в Firestore
    const unsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid, 'timer', 'current'),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          dispatch(syncTimerState({
            isRunning: data.isRunning,
            startTime: data.startTime?.toMillis() || null,
            elapsed: data.elapsed || 0,
            workTypeId: data.workTypeId || null,
            locationId: data.locationId || null,
            lastSyncTime: Date.now(),
          }));
        }
      }
    );

    // Оновлення elapsed кожну секунду
    const intervalId = setInterval(() => {
      dispatch(updateElapsed());
    }, 1000);

    // Синхронізація з Firestore кожні 5 секунд
    const syncIntervalId = setInterval(async () => {
      if (timerState.isRunning) {
        const docRef = doc(db, 'users', currentUser.uid, 'timer', 'current');
        await setDoc(docRef, {
          isRunning: timerState.isRunning,
          startTime: timerState.startTime ? new Timestamp(Math.floor(timerState.startTime / 1000), 0) : null,
          elapsed: timerState.elapsed,
          workTypeId: timerState.workTypeId,
          locationId: timerState.locationId,
          updatedAt: Timestamp.now(),
        });
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
      clearInterval(syncIntervalId);
    };
  }, [currentUser, dispatch, timerState]);
}; 