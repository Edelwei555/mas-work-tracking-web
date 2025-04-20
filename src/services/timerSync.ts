import { getDatabase, ref, onValue, set, off } from 'firebase/database';
import { TimeEntry } from '../types/timeEntry';

interface TimerState {
  entry: TimeEntry | null;
  lastUpdate: number;
  deviceId: string;
}

// Генеруємо унікальний ID для пристрою
const deviceId = Math.random().toString(36).substring(2);

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
    const data = snapshot.val() as TimerState | null;
    
    // Ігноруємо оновлення від поточного пристрою
    if (data && data.deviceId === deviceId) {
      return;
    }
    
    callback(data?.entry || null);
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
  const state: TimerState = {
    entry,
    lastUpdate: Date.now(),
    deviceId
  };
  
  await set(timerRef, state);
}; 