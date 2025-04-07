import { getDatabase, ref, onValue, set, off } from 'firebase/database';
import { TimeEntry } from './timeTracking';

// Функція для отримання референсу на таймер користувача
const getTimerRef = (userId: string) => {
  const db = getDatabase();
  return ref(db, `timers/${userId}`);
};

// Функція для підписки на зміни таймера
export const subscribeToTimer = (
  userId: string, 
  callback: (entry: TimeEntry | null) => void
) => {
  const timerRef = getTimerRef(userId);
  
  onValue(timerRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });

  // Повертаємо функцію для відписки
  return () => off(timerRef);
};

// Функція для оновлення стану таймера
export const updateTimerState = async (
  userId: string, 
  entry: TimeEntry | null
) => {
  const timerRef = getTimerRef(userId);
  await set(timerRef, entry);
}; 