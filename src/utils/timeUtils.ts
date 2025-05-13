export const formatTime = (seconds: number): string => {
  if (!seconds && seconds !== 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const calculateDuration = (startTime: Date, endTime: Date | null, pausedTime: number = 0): number => {
  if (!endTime) return 0;
  
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
  return Math.max(0, duration - pausedTime);
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}; 