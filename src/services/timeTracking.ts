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

export interface TimeEntry {
  id?: string;
  userId: string;
  workTypeId: string;
  locationId: string;
  startTime: Date;
  endTime?: Date | null;
  pausedTime: number;
  workAmount?: number;
  duration?: number;
  createdAt: Date;
  isRunning: boolean;
  lastUpdate: Date;
  lastPauseTime?: Date;
}

interface FirestoreTimeEntry extends Omit<TimeEntry, 'startTime' | 'endTime' | 'createdAt' | 'lastUpdate' | 'lastPauseTime'> {
  startTime: Timestamp;
  endTime?: Timestamp | null;
  createdAt: Timestamp;
  lastUpdate: Timestamp;
  lastPauseTime?: Timestamp;
}

// Зберігаємо стан таймера в localStorage
const TIMER_STATE_KEY = 'timerState';

export const saveTimerState = (timeEntry: TimeEntry) => {
  localStorage.setItem(TIMER_STATE_KEY, JSON.stringify({
    ...timeEntry,
    startTime: timeEntry.startTime.toISOString(),
    endTime: timeEntry.endTime?.toISOString(),
    createdAt: timeEntry.createdAt.toISOString(),
    lastUpdate: timeEntry.lastUpdate.toISOString(),
    lastPauseTime: timeEntry.lastPauseTime?.toISOString()
  }));
};

export const getTimerState = (): TimeEntry | null => {
  const state = localStorage.getItem(TIMER_STATE_KEY);
  if (!state) return null;

  const data = JSON.parse(state);
  return {
    ...data,
    startTime: new Date(data.startTime),
    endTime: data.endTime ? new Date(data.endTime) : null,
    createdAt: new Date(data.createdAt),
    lastUpdate: new Date(data.lastUpdate),
    lastPauseTime: data.lastPauseTime ? new Date(data.lastPauseTime) : undefined
  };
};

export const clearTimerState = () => {
  localStorage.removeItem(TIMER_STATE_KEY);
};

export const saveTimeEntry = async (timeEntry: Omit<TimeEntry, 'createdAt' | 'lastUpdate'>) => {
  try {
    const firestoreEntry: Partial<FirestoreTimeEntry> = {
      ...timeEntry,
      startTime: Timestamp.fromDate(timeEntry.startTime),
      endTime: timeEntry.endTime ? Timestamp.fromDate(timeEntry.endTime) : null,
      lastPauseTime: timeEntry.lastPauseTime ? Timestamp.fromDate(timeEntry.lastPauseTime) : undefined,
      createdAt: Timestamp.now(),
      lastUpdate: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'timeEntries'), firestoreEntry);

    if (timeEntry.isRunning) {
      saveTimerState({
        ...timeEntry,
        id: docRef.id,
        createdAt: new Date(),
        lastUpdate: new Date()
      });
    }

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
    if (data.lastPauseTime) {
      updateData.lastPauseTime = Timestamp.fromDate(data.lastPauseTime);
    }
    
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
          lastUpdate: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Error updating time entry:', error);
    throw error;
  }
};

export const getCurrentTimeEntry = async (userId: string): Promise<TimeEntry | null> => {
  try {
    // Спочатку перевіряємо локальний стан
    const localState = getTimerState();
    if (localState && localState.userId === userId && localState.isRunning) {
      // Перевіряємо, чи не минуло забагато часу з останнього оновлення
      const timeSinceLastUpdate = Date.now() - localState.lastUpdate.getTime();
      if (timeSinceLastUpdate < 24 * 60 * 60 * 1000) { // 24 години
        return localState;
      }
    }

    // Якщо немає локального стану або він застарів, перевіряємо Firestore
    const q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', userId),
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
      endTime: data.endTime?.toDate() || null,
      createdAt: data.createdAt.toDate(),
      lastUpdate: data.lastUpdate.toDate(),
      lastPauseTime: data.lastPauseTime?.toDate()
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

export const getUserTimeEntries = async (userId: string, startDate?: Date, endDate?: Date) => {
  try {
    let q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', userId),
      orderBy('startTime', 'desc')
    );

    if (startDate) {
      q = query(q, where('startTime', '>=', Timestamp.fromDate(startDate)));
    }

    if (endDate) {
      q = query(q, where('startTime', '<=', Timestamp.fromDate(endDate)));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as FirestoreTimeEntry;
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime.toDate(),
        endTime: data.endTime?.toDate() || null,
        createdAt: data.createdAt.toDate(),
        lastUpdate: data.lastUpdate.toDate(),
        lastPauseTime: data.lastPauseTime?.toDate()
      } as TimeEntry;
    });
  } catch (error) {
    console.error('Error getting time entries:', error);
    throw error;
  }
}; 