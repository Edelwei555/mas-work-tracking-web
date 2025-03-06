import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy
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
  isRunning?: boolean;
}

export const saveTimeEntry = async (timeEntry: Omit<TimeEntry, 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'timeEntries'), {
      ...timeEntry,
      startTime: Timestamp.fromDate(timeEntry.startTime as Date),
      endTime: timeEntry.endTime ? Timestamp.fromDate(timeEntry.endTime as Date) : null,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving time entry:', error);
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
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime.toDate(),
      endTime: doc.data().endTime?.toDate() || null,
      createdAt: doc.data().createdAt.toDate()
    })) as TimeEntry[];
  } catch (error) {
    console.error('Error getting time entries:', error);
    throw error;
  }
}; 