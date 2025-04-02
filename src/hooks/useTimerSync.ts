import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateElapsed, syncTimerState } from '../store/timerSlice';
import { useAuth } from '../contexts/AuthContext';
import { RootState } from '../store/store';

export const useTimerSync = () => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const timerState = useSelector((state: RootState) => state.timer);

  // Синхронізація з Firestore
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      doc(db, 'timers', currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          const serverState = doc.data();
          if (serverState.isRunning) {
            dispatch(syncTimerState({
              isRunning: true,
              startTime: serverState.startTime,
              elapsed: Date.now() - serverState.startTime,
              workTypeId: serverState.workTypeId,
              locationId: serverState.locationId
            }));
          }
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser, dispatch]);

  // Оновлення elapsed кожну секунду
  useEffect(() => {
    if (!timerState.isRunning) return;

    const interval = setInterval(() => {
      dispatch(updateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState.isRunning, dispatch]);

  // Синхронізація з сервером кожні 5 секунд
  useEffect(() => {
    if (!timerState.isRunning || !currentUser) return;

    const interval = setInterval(async () => {
      await setDoc(doc(db, 'timers', currentUser.uid), {
        ...timerState,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [timerState, currentUser]);
}; 