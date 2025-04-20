export interface TimeEntry {
    id?: string;
    startTime: Date;
    endTime: Date;
    isRunning: boolean;
    workAmount: number;
    pausedTime: number;
    userId: string;
    teamId: string;
    workTypeId: string;
    locationId: string;
    duration: number;
    lastPauseTime: null;
    createdAt?: Date;
    lastUpdate?: Date;
} 