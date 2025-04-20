import { ref, onValue, set, off } from 'firebase/database';
import { TimeEntry } from '../types';
import { database } from '../config/firebase';

interface TimerState {
  entry: TimeEntry | null;
  lastUpdate: number;
  deviceId: string;
}

// Генеруємо унікальний ID для пристрою
const deviceId = Math.random().toString(36).substring(2);

// Функція для отримання референсу на таймер користувача
const getTimerRef = (userId: string) => {
  return ref(database, `timers/${userId}`);
};

// Функція для підписки на зміни таймера
export const subscribeToTimer = (
  userId: string, 
  callback: (entry: TimeEntry | null) => void
) => {
  try {
    const timerRef = getTimerRef(userId);
    
    onValue(timerRef, (snapshot) => {
      try {
        const data = snapshot.val() as TimerState | null;
        
        // Ігноруємо оновлення від поточного пристрою
        if (data && data.deviceId === deviceId) {
          return;
        }
        
        console.log('Received timer update:', data);
        callback(data?.entry || null);
      } catch (error) {
        console.error('Error processing timer update:', error);
      }
    });

    // Повертаємо функцію для відписки
    return () => off(timerRef);
  } catch (error) {
    console.error('Error subscribing to timer:', error);
    return () => {};
  }
};

// Функція для оновлення стану таймера
export const updateTimerState = async (
  userId: string, 
  entry: TimeEntry | null
) => {
  try {
    const timerRef = getTimerRef(userId);
    const state: TimerState = {
      entry,
      lastUpdate: Date.now(),
      deviceId
    };
    
    await set(timerRef, state);
    console.log('Timer state updated successfully:', state);
  } catch (error) {
    console.error('Error updating timer state:', error);
    throw error;
  }
}; 