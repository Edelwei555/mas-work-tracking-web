import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp, Query } from 'firebase/firestore';
import { TimeEntry } from '../types/timeEntry';
import * as XLSX from 'xlsx';
import { getTeamMembers } from './teams';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  teamId?: string;
  locationId?: string;
  workTypeId?: string;
}

export const generateReport = async (userId: string, filters: ReportFilters): Promise<TimeEntry[]> => {
  const timeEntriesRef = collection(db, 'timeEntries');
  let userIds = [userId];

  // Якщо вибрана команда, отримуємо ID всіх її учасників
  if (filters.teamId) {
    const teamMembers = await getTeamMembers(filters.teamId);
    userIds = Array.from(new Set([...userIds, ...teamMembers.map(member => member.id)]));
  }

  // Створюємо запит для кожного користувача
  const queries = userIds.map(userId => {
    let q = query(
      timeEntriesRef,
      where('userId', '==', userId),
      where('startTime', '>=', Timestamp.fromDate(filters.startDate)),
      where('startTime', '<=', Timestamp.fromDate(filters.endDate))
    );

    if (filters.locationId) {
      q = query(q, where('locationId', '==', filters.locationId));
    }
    if (filters.workTypeId) {
      q = query(q, where('workTypeId', '==', filters.workTypeId));
    }

    return getDocs(q);
  });

  // Отримуємо дані для всіх запитів
  const results = await Promise.all(queries);
  
  // Об'єднуємо результати
  return results.flatMap(result => 
    result.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        workTypeId: data.workTypeId,
        locationId: data.locationId,
        startTime: data.startTime.toDate(),
        endTime: data.endTime ? data.endTime.toDate() : null,
        pausedTime: data.pausedTime,
        workAmount: data.workAmount,
        duration: data.duration,
        createdAt: data.createdAt.toDate(),
        isRunning: data.isRunning
      } as TimeEntry;
    })
  );
};

export const exportToExcel = (data: TimeEntry[], locations: { id: string; name: string }[], workTypes: { id: string; name: string }[]): void => {
  const worksheetData = data.map(entry => ({
    'Дата': (entry.startTime as Date).toLocaleDateString(),
    'Працівник': entry.userId,
    'Локація': locations.find(l => l.id === entry.locationId)?.name || '',
    'Вид роботи': workTypes.find(w => w.id === entry.workTypeId)?.name || '',
    'Витрачений час': entry.duration || 0,
    'Обсяг роботи': entry.workAmount || 0
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Звіт');

  // Генеруємо унікальне ім'я файлу з поточною датою
  const fileName = `Звіт_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Зберігаємо файл
  XLSX.writeFile(workbook, fileName);
}; 