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
  getDoc,
  setDoc,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { TimeEntry, FirestoreTimeEntry } from '../types/timeEntry';

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

const convertToFirestore = (entry: Partial<TimeEntry>): Partial<FirestoreTimeEntry> => {
  const result: Partial<FirestoreTimeEntry> = {};
  
  // Копіюємо всі поля, крім дат
  Object.entries(entry).forEach(([key, value]) => {
    if (!['startTime', 'endTime', 'lastPauseTime', 'createdAt', 'lastUpdate'].includes(key)) {
      (result as any)[key] = value;
    }
  });
  
  // Конвертуємо дати в Timestamp
  if (entry.startTime) {
    result.startTime = Timestamp.fromDate(entry.startTime);
  }
  if (entry.endTime) {
    result.endTime = Timestamp.fromDate(entry.endTime);
  }
  if (entry.lastPauseTime) {
    result.lastPauseTime = Timestamp.fromDate(entry.lastPauseTime);
  }
  if (entry.createdAt) {
    result.createdAt = Timestamp.fromDate(entry.createdAt);
  }
  if (entry.lastUpdate) {
    result.lastUpdate = Timestamp.fromDate(entry.lastUpdate);
  }
  
  return result;
};

const convertFromFirestore = (doc: FirestoreTimeEntry & { id: string }): TimeEntry => {
  return {
    ...doc,
    startTime: doc.startTime.toDate(),
    endTime: doc.endTime?.toDate() || null,
    lastPauseTime: doc.lastPauseTime?.toDate() || null,
    createdAt: doc.createdAt.toDate(),
    lastUpdate: doc.lastUpdate.toDate()
  };
};

export const saveTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'createdAt' | 'lastUpdate'>): Promise<string> => {
  try {
    const now = new Date();
    const firestoreEntry = convertToFirestore({
      ...entry,
      createdAt: now,
      lastUpdate: now
    }) as FirestoreTimeEntry;

    const docRef = doc(collection(db, 'timeEntries'));
    await setDoc(docRef, firestoreEntry);
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving time entry:', error);
    throw error;
  }
};

export const updateTimeEntry = async (id: string, data: Partial<TimeEntry>): Promise<void> => {
  try {
    const now = new Date();
    const updateData = convertToFirestore({
      ...data,
      lastUpdate: now
    });

    const docRef = doc(db, 'timeEntries', id);
    await updateDoc(docRef, updateData as DocumentData);
  } catch (error) {
    console.error('Error updating time entry:', error);
    throw error;
  }
};

export const getCurrentTimeEntry = async (userId: string, teamId: string): Promise<TimeEntry | null> => {
  try {
    const q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', userId),
      where('teamId', '==', teamId),
      where('isRunning', '==', true)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data() as FirestoreTimeEntry;
    
    // Перевіряємо, чи запис не застарів (більше 24 годин)
    const now = new Date();
    const startTime = data.startTime.toDate();
    const timeSinceStart = now.getTime() - startTime.getTime();
    
    if (timeSinceStart > 24 * 60 * 60 * 1000) { // 24 години
      // Автоматично зупиняємо застарілий запис
      const updateData = convertToFirestore({
        isRunning: false,
        endTime: now,
        lastUpdate: now
      });
      
      await updateDoc(doc.ref, updateData as DocumentData);
      return null;
    }

    return convertFromFirestore({ ...data, id: doc.id });
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