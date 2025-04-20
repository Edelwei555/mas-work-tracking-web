import { TimeEntry } from '../types/timeEntry';
import { Location } from './locations';
import { WorkType } from './workTypes';
import { User } from './teams';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

interface ExportData {
  date: string;
  worker: string;
  location: string;
  workType: string;
  timeSpent: number;
  workAmount: number;
}

const prepareData = (
  entries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[],
  teamMembers: User[]
): ExportData[] => {
  return entries.map(entry => {
    const member = teamMembers.find(m => m.id === entry.userId);
    const location = locations.find(l => l.id === entry.locationId);
    const workType = workTypes.find(w => w.id === entry.workTypeId);
    
    return {
      date: entry.startTime.toLocaleDateString(),
      worker: member?.displayName || member?.email || '',
      location: location?.name || '',
      workType: workType?.name || '',
      timeSpent: Math.round((entry.endTime!.getTime() - entry.startTime.getTime()) / 1000 / 60),
      workAmount: entry.workAmount || 0
    };
  });
};

export const exportToExcel = async (
  entries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[],
  teamMembers: User[]
): Promise<void> => {
  const data = prepareData(entries, locations, workTypes, teamMembers);
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Звіт');
  
  XLSX.writeFile(wb, 'звіт.xlsx');
};

export const exportToPDF = async (
  entries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[],
  teamMembers: User[]
): Promise<void> => {
  const data = prepareData(entries, locations, workTypes, teamMembers);
  
  const doc = new jsPDF();
  
  // Заголовок
  doc.setFontSize(16);
  doc.text('Звіт про роботу', 14, 15);
  
  // Таблиця
  const tableData = data.map(row => [
    row.date,
    row.worker,
    row.location,
    row.workType,
    `${row.timeSpent} хв`,
    row.workAmount.toString()
  ]);
  
  (doc as any).autoTable({
    head: [['Дата', 'Працівник', 'Локація', 'Тип роботи', 'Час', 'Обсяг']],
    body: tableData,
    startY: 20,
    theme: 'grid',
    headStyles: { fillColor: [0, 123, 255] },
    styles: { fontSize: 8 }
  });
  
  doc.save('звіт.pdf');
};

export const exportToCSV = async (
  entries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[],
  teamMembers: User[]
): Promise<void> => {
  const data = prepareData(entries, locations, workTypes, teamMembers);
  
  const headers = ['Дата', 'Працівник', 'Локація', 'Тип роботи', 'Час', 'Обсяг'];
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.date,
      `"${row.worker}"`,
      `"${row.location}"`,
      `"${row.workType}"`,
      `${row.timeSpent}`,
      row.workAmount
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'звіт.csv';
  link.click();
}; 