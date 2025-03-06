import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TimeEntry } from '../../services/timeTracking';
import { Location } from '../../services/locations';
import { WorkType } from '../../services/workTypes';

interface ReportChartsProps {
  timeEntries: TimeEntry[];
  locations: Location[];
  workTypes: WorkType[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportCharts: React.FC<ReportChartsProps> = ({ timeEntries, locations, workTypes }) => {
  const { t } = useTranslation();

  // Підготовка даних для графіків
  const dailyData = timeEntries.reduce((acc: any[], entry) => {
    const date = (entry.startTime as Date).toLocaleDateString();
    
    const existingDay = acc.find(d => d.date === date);
    if (existingDay) {
      existingDay.duration += entry.duration || 0;
      existingDay.workAmount += entry.workAmount || 0;
    } else {
      acc.push({
        date,
        duration: entry.duration || 0,
        workAmount: entry.workAmount || 0
      });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const locationData = locations.map(location => ({
    name: location.name,
    value: timeEntries
      .filter(entry => entry.locationId === location.id)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0)
  }));

  const workTypeData = workTypes.map(workType => ({
    name: workType.name,
    value: timeEntries
      .filter(entry => entry.workTypeId === workType.id)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0)
  }));

  return (
    <div className="report-charts">
      <h3>{t('reports.charts.title')}</h3>
      
      <div className="chart-container">
        <h4>{t('reports.charts.dailyProgress')}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="duration" stroke="#8884d8" name={t('reports.columns.timeSpent')} />
            <Line type="monotone" dataKey="workAmount" stroke="#82ca9d" name={t('reports.columns.workAmount')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h4>{t('reports.charts.byLocation')}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={locationData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {locationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h4>{t('reports.charts.byWorkType')}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name={t('reports.columns.timeSpent')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportCharts; 