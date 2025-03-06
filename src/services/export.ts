import { TimeEntry } from './timeTracking';
import { Location } from './locations';
import { WorkType } from './workTypes';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
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
  timeEntries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[]
): ExportData[] => {
  return timeEntries.map(entry => ({
    date: (entry.startTime as Date).toLocaleDateString(),
    worker: entry.userId,
    location: locations.find(l => l.id === entry.locationId)?.name || '',
    workType: workTypes.find(w => w.id === entry.workTypeId)?.name || '',
    timeSpent: entry.duration || 0,
    workAmount: entry.workAmount || 0
  }));
};

export const exportToExcel = async (
  timeEntries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[]
) => {
  const data = prepareData(timeEntries, locations, workTypes);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Звіт');
  XLSX.writeFile(wb, 'звіт.xlsx');
};

export const exportToPDF = async (
  timeEntries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[]
) => {
  const data = prepareData(timeEntries, locations, workTypes);
  const doc = new jsPDF();

  // Додаємо заголовок
  doc.setFontSize(16);
  doc.text('Звіт про роботу', 14, 15);

  // Додаємо дату генерації
  doc.setFontSize(10);
  doc.text(`Згенеровано: ${new Date().toLocaleString()}`, 14, 25);

  // Додаємо таблицю
  const tableData = data.map(row => [
    row.date,
    row.worker,
    row.location,
    row.workType,
    row.timeSpent.toString(),
    row.workAmount.toString()
  ]);

  (doc as any).autoTable({
    head: [['Дата', 'Працівник', 'Локація', 'Вид роботи', 'Час', 'Обсяг']],
    body: tableData,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 }
    }
  });

  doc.save('звіт.pdf');
};

export const exportToCSV = async (
  timeEntries: TimeEntry[],
  locations: Location[],
  workTypes: WorkType[]
) => {
  const data = prepareData(timeEntries, locations, workTypes);
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'звіт.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 