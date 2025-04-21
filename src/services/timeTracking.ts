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
import { TimeEntry } from '../types';

interface FirestoreTimeEntry {
  userId: string;
  teamId: string;
  workTypeId: string;
  locationId: string;
  startTime: Timestamp;
  endTime: Timestamp | null;
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
    endTime: timeEntry.endTime ? timeEntry.endTime.toISOString() : null,
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
    endTime: data.endTime ? new Date(data.endTime) : null,
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
      endTime: timeEntry.endTime ? Timestamp.fromDate(timeEntry.endTime) : null,
      pausedTime: timeEntry.pausedTime || 0,
      workAmount: timeEntry.workAmount || 0,
      isRunning: timeEntry.isRunning,
      duration: timeEntry.duration || 0,
      lastPauseTime: null,
      createdAt: Timestamp.now(),
      lastUpdate: Timestamp.now()
    };

    const docRef = await addDoc(timeEntriesRef, firestoreEntry);
    const id = docRef.id;

    const fullEntry = {
      ...timeEntry,
      id,
      createdAt: new Date(),
      lastUpdate: new Date()
    };

    // Зберігаємо стан таймера в localStorage і синхронізуємо через Realtime Database
    if (timeEntry.isRunning) {
      saveTimerState(fullEntry);
    }

    return id;
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

    // Якщо таймер зупинено або завершено, очищуємо локальний стан
    if (data.isRunning === false || data.endTime) {
      clearTimerState();
      return;
    }

    // Оновлюємо стан в localStorage тільки якщо таймер активний
    const currentState = getTimerState();
    if (currentState?.id === id && data.isRunning) {
      const updatedEntry = {
        ...currentState,
        ...data,
        lastUpdate: new Date(),
        lastPauseTime: null
      };
      saveTimerState(updatedEntry);
    }
  } catch (error) {
    console.error('Error updating time entry:', error);
    throw error;
  }
};

export const getCurrentTimeEntry = async (userId: string, teamId: string): Promise<TimeEntry | null> => {
  try {
    // Спочатку перевіряємо Firestore
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
      endTime: data.endTime ? data.endTime.toDate() : null,
      createdAt: data.createdAt.toDate(),
      lastUpdate: data.lastUpdate.toDate(),
      lastPauseTime: null
    };

    // Оновлюємо локальний стан тільки якщо запис активний
    if (timeEntry.isRunning) {
      saveTimerState(timeEntry);
    } else {
      clearTimerState();
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
      console.log('Entry data:', data);

      return {
        id: doc.id,
        userId: data.userId,
        teamId: data.teamId,
        workTypeId: data.workTypeId,
        locationId: data.locationId,
        startTime: data.startTime.toDate(),
        endTime: data.endTime ? data.endTime.toDate() : null,
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