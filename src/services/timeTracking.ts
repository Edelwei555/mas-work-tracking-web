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
  DocumentData,
  deleteDoc,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';
import { TimeEntry, FirestoreTimeEntry, PendingTimeEntry } from '../types/timeEntry';

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

export const getTeamTimeEntries = async (
  teamId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TimeEntry[]> => {
  try {
    const entriesRef = collection(db, 'timeEntries');
    let q = query(
      entriesRef,
      where('teamId', '==', teamId)
    );

    if (startDate) {
      q = query(q, where('startTime', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      q = query(q, where('startTime', '<=', Timestamp.fromDate(endDate)));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreTimeEntry;
      return {
        ...data,
        id: doc.id,
        startTime: data.startTime.toDate(),
        endTime: data.endTime?.toDate() || null,
        createdAt: data.createdAt.toDate(),
        lastUpdate: data.lastUpdate.toDate(),
        lastPauseTime: data.lastPauseTime?.toDate() || null,
        status: data.status || 'completed'
      };
    });
  } catch (error) {
    console.error('Error getting team time entries:', error);
    throw error;
  }
};

export const savePendingTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'workAmount'>): Promise<string> => {
  try {
    const now = new Date();
    const pendingEntry: PendingTimeEntry = {
      ...entry,
      workAmount: undefined,
      status: 'pending'
    };

    const docRef = doc(collection(db, 'timeEntries'));
    await setDoc(docRef, {
      ...pendingEntry,
      startTime: Timestamp.fromDate(pendingEntry.startTime),
      endTime: pendingEntry.endTime ? Timestamp.fromDate(pendingEntry.endTime) : null,
      createdAt: Timestamp.fromDate(now),
      lastUpdate: Timestamp.fromDate(now),
      lastPauseTime: pendingEntry.lastPauseTime ? Timestamp.fromDate(pendingEntry.lastPauseTime) : null
    });

    return docRef.id;
  } catch (error) {
    console.error('Error saving pending time entry:', error);
    throw error;
  }
};

export const getPendingTimeEntries = async (userId: string): Promise<PendingTimeEntry[]> => {
  try {
    const q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as FirestoreTimeEntry;
      return {
        ...convertFromFirestore({ ...data, id: doc.id }),
        workAmount: undefined,
        status: 'pending'
      } as PendingTimeEntry;
    });
  } catch (error) {
    console.error('Error getting pending time entries:', error);
    throw error;
  }
};

export const updatePendingTimeEntry = async (id: string | undefined, workAmount: number): Promise<void> => {
  if (!id) {
    throw new Error('Entry ID is required');
  }

  try {
    const now = new Date();
    const updateData = {
      workAmount,
      status: 'completed',
      lastUpdate: Timestamp.fromDate(now)
    };

    const docRef = doc(db, 'timeEntries', id);
    await updateDoc(docRef, updateData as DocumentData);
  } catch (error) {
    console.error('Error updating pending time entry:', error);
    throw error;
  }
}; 