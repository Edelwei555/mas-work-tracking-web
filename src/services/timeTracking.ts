import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  updateDoc,
  doc,
  getDoc
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
  lastPauseTime: Timestamp | null;
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
    
    // Спочатку отримуємо поточний запис
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Time entry not found');
    }

    const currentData = docSnap.data() as FirestoreTimeEntry;
    
    // Створюємо базовий об'єкт оновлення
    const updateData: Partial<FirestoreTimeEntry> = {
      lastUpdate: Timestamp.now()
    };

    // Копіюємо всі поля, крім дат
    Object.entries(data).forEach(([key, value]) => {
      if (!['startTime', 'endTime', 'lastPauseTime', 'createdAt', 'lastUpdate'].includes(key)) {
        (updateData as any)[key] = value;
      }
    });
    
    // Конвертуємо дати в Timestamp
    if (data.startTime) {
      updateData.startTime = Timestamp.fromDate(data.startTime);
    }
    if (data.endTime) {
      updateData.endTime = Timestamp.fromDate(data.endTime);
    }
    if (data.lastPauseTime) {
      updateData.lastPauseTime = Timestamp.fromDate(data.lastPauseTime);
    } else if (data.hasOwnProperty('lastPauseTime')) {
      updateData.lastPauseTime = null;
    }

    // Якщо запис зупиняється, встановлюємо всі необхідні поля
    if (data.isRunning === false) {
      updateData.isRunning = false;
      updateData.endTime = Timestamp.now();
      if (!updateData.duration) {
        const now = new Date();
        const start = currentData.startTime.toDate();
        const pausedTime = currentData.pausedTime || 0;
        updateData.duration = Math.max(0, now.getTime() - start.getTime() - pausedTime);
      }
    }
    
    await updateDoc(docRef, updateData);

    // Завжди очищуємо локальний стан при оновленні
    clearTimerState();

    // Оновлюємо локальний стан тільки якщо таймер активний
    if (data.isRunning === true) {
      const updatedEntry = {
        ...currentData,
        ...data,
        id,
        startTime: data.startTime || currentData.startTime.toDate(),
        endTime: data.endTime || null,
        lastUpdate: new Date(),
        lastPauseTime: data.lastPauseTime || null,
        createdAt: currentData.createdAt.toDate()
      } as TimeEntry;
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
    
    // Якщо немає активних записів, очищуємо локальний стан
    if (querySnapshot.empty) {
      clearTimerState();
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data() as FirestoreTimeEntry;
    
    // Перевіряємо, чи запис не застарів
    const now = new Date();
    const startTime = data.startTime.toDate();
    const timeSinceStart = now.getTime() - startTime.getTime();
    
    if (timeSinceStart > 24 * 60 * 60 * 1000) { // 24 години
      clearTimerState();
      
      // Автоматично зупиняємо застарілий запис
      await updateDoc(doc.ref, {
        isRunning: false,
        endTime: Timestamp.now(),
        lastUpdate: Timestamp.now()
      });
      
      return null;
    }

    // Якщо запис не активний, повертаємо null
    if (!data.isRunning) {
      clearTimerState();
      return null;
    }

    const timeEntry: TimeEntry = {
      id: doc.id,
      userId: data.userId,
      teamId: data.teamId,
      workTypeId: data.workTypeId,
      locationId: data.locationId,
      startTime: startTime,
      endTime: data.endTime ? data.endTime.toDate() : null,
      pausedTime: data.pausedTime || 0,
      workAmount: data.workAmount || 0,
      isRunning: data.isRunning,
      duration: data.duration || 0,
      lastPauseTime: null,
      createdAt: data.createdAt.toDate(),
      lastUpdate: data.lastUpdate.toDate()
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
    clearTimerState();
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