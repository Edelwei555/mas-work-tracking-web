import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchCurrentTimer } from '../store/timerSlice';
import { useAppDispatch } from './useAppDispatch';

export const useTimerSync = () => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAuth();

  useEffect(() => {
    let syncInterval: NodeJS.Timeout;

    const syncTimer = async () => {
      if (!currentUser) return;

      try {
        // Отримуємо ID команди з localStorage або іншого джерела
        const teamId = localStorage.getItem('currentTeamId');
        if (!teamId) return;

        await dispatch(fetchCurrentTimer({ userId: currentUser.uid, teamId }));
      } catch (error) {
        console.error('Error syncing timer:', error);
      }
    };

    // Синхронізуємо кожні 30 секунд
    syncInterval = setInterval(syncTimer, 30000);
    
    // Початкова синхронізація
    syncTimer();

    return () => {
      clearInterval(syncInterval);
    };
  }, [currentUser, dispatch]);
}; 