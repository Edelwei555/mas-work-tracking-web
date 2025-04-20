import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TimeEntry } from '../types/timeEntry';

interface FirestoreTimeEntry {
  userId: string;
  teamId: string;
  workTypeId: string;
  locationId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  pausedTime: number;
  workAmount: number;
  isRunning: boolean;
  duration: number;
  lastPauseTime: null;
  createdAt: Timestamp;
  lastUpdate: Timestamp;
}

// Зберігаємо стан таймера в localStorage
const TIMER_STATE_KEY = 'timerState';

export const saveTimerState = (timeEntry: TimeEntry) => {
  localStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
    ...timeEntry,
    startTime: timeEntry.startTime.toISOString(),
    endTime: timeEntry.endTime.toISOString(),
    createdAt: timeEntry.createdAt?.toISOString(),
    lastUpdate: timeEntry.lastUpdate?.toISOString(),
    lastPauseTime: null
  }));
};

export const getTimerState = (): TimeEntry | null => {
  const state = localStorage.getItem(TIMER_STATE_KEY);
  if (!state) return null;

  const data = JSON.parse(state);
  return {
    ...data,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
    lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : undefined,
    lastPauseTime: null
  };
};

export const clearTimerState = () => {
  localStorage.removeItem(TIMER_STATE_KEY);
};

export const saveTimeEntry = async (timeEntry: Omit<TimeEntry, 'createdAt' | 'lastUpdate' | 'id'>) => {
  try {
    const timeEntriesRef = collection(db, 'timeEntries');
    
    // Конвертуємо дати в Timestamp
    const firestoreEntry: FirestoreTimeEntry = {
      userId: timeEntry.userId,
      teamId: timeEntry.teamId,
      workTypeId: timeEntry.workTypeId,
      locationId: timeEntry.locationId,
      startTime: Timestamp.fromDate(timeEntry.startTime),
      endTime: Timestamp.fromDate(timeEntry.endTime),
      pausedTime: timeEntry.pausedTime,
      workAmount: timeEntry.workAmount,
      isRunning: timeEntry.isRunning,
      duration: timeEntry.duration,
      lastPauseTime: null,
      createdAt: Timestamp.now(),
      lastUpdate: Timestamp.now()
    };

    const docRef = await addDoc(timeEntriesRef, firestoreEntry);
    return docRef.id;
  } catch (error) {
    console.error('Error saving time entry:', error);
    throw error;
  }
};

export const updateTimeEntry = async (id: string, data: Partial<TimeEntry>) => {
  try {
    const docRef = doc(db, 'timeEntries', id);
    const updateData: Partial<FirestoreTimeEntry> = {
      ...Object.fromEntries(
        Object.entries(data).filter(([key]) => 
          !['startTime', 'endTime', 'lastPauseTime', 'createdAt', 'lastUpdate'].includes(key)
        )
      ),
      lastUpdate: Timestamp.now()
    };
    
    if (data.startTime) {
      updateData.startTime = Timestamp.fromDate(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = Timestamp.fromDate(data.endTime);
    }
    // lastPauseTime завжди null
    updateData.lastPauseTime = null;
    
    await updateDoc(docRef, updateData);

    // Оновлюємо стан в localStorage
    const currentState = getTimerState();
    if (currentState?.id === id) {
      if (data.isRunning === false) {
        clearTimerState();
      } else {
        saveTimerState({
          ...currentState,
          ...data,
          lastUpdate: new Date(),
          lastPauseTime: null
        });
      }
    }
  } catch (error) {
    console.error('Error updating time entry:', error);
    throw error;
  }
};

export const getCurrentTimeEntry = async (userId: string, teamId: string): Promise<TimeEntry | null> => {
  try {
    // Спочатку перевіряємо локальний стан
    const localState = getTimerState();
    if (localState && localState.userId === userId && localState.teamId === teamId && localState.isRunning) {
      // Перевіряємо, чи не минуло забагато часу з останнього оновлення
      const lastUpdateTime = localState.lastUpdate?.getTime() || Date.now();
      const timeSinceLastUpdate = Date.now() - lastUpdateTime;
      if (timeSinceLastUpdate < 24 * 60 * 60 * 1000) { // 24 години
        return localState;
      }
    }

    // Якщо немає локального стану або він застарів, перевіряємо Firestore
    const q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', userId),
      where('teamId', '==', teamId),
      where('isRunning', '==', true),
      orderBy('startTime', 'desc'),
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      clearTimerState();
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data() as FirestoreTimeEntry;
    
    const timeEntry: TimeEntry = {
      id: doc.id,
      ...data,
      startTime: data.startTime.toDate(),
      endTime: data.endTime.toDate(),
      createdAt: data.createdAt.toDate(),
      lastUpdate: data.lastUpdate.toDate(),
      lastPauseTime: null
    };

    // Оновлюємо локальний стан
    if (timeEntry.isRunning) {
      saveTimerState(timeEntry);
    }

    return timeEntry;
  } catch (error) {
    console.error('Error getting current time entry:', error);
    throw error;
  }
};

export const getTeamTimeEntries = async (teamId: string, startDate?: Date, endDate?: Date) => {
  try {
    let baseQuery = query(
      collection(db, 'timeEntries'),
      where('teamId', '==', teamId)
    );

    // Додаємо фільтри за датою, якщо вони вказані
    if (startDate && endDate) {
      baseQuery = query(
        baseQuery,
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
      );
    }

    // Додаємо сортування
    const q = query(baseQuery, orderBy('startTime', 'desc'));

    const querySnapshot = await getDocs(q);
    console.log('Found entries:', querySnapshot.size); // Додаємо лог

    return querySnapshot.docs.map(doc => {
      const data = doc.data() as FirestoreTimeEntry;
      console.log('Entry data:', data); // Додаємо лог для кожного запису

      return {
        id: doc.id,
        userId: data.userId,
        teamId: data.teamId,
        workTypeId: data.workTypeId,
        locationId: data.locationId,
        startTime: data.startTime.toDate(),
        endTime: data.endTime.toDate(),
        pausedTime: data.pausedTime,
        workAmount: data.workAmount,
        isRunning: data.isRunning,
        duration: data.duration,
        lastPauseTime: null,
        createdAt: data.createdAt.toDate(),
        lastUpdate: data.lastUpdate.toDate()
      } satisfies TimeEntry;
    });
  } catch (error) {
    console.error('Error getting time entries:', error);
    throw error;
  }
}; 