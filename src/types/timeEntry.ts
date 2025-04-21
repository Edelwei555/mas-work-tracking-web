import { Timestamp } from 'firebase/firestore';

export interface TimeEntry {
    id?: string;
    startTime: Date;
    endTime: Date | null;
    isRunning: boolean;
    workAmount: number;
    pausedTime: number;
    userId: string;
    teamId: string;
    workTypeId: string;
    locationId: string;
    duration: number;
    lastPauseTime: Date | null;
    createdAt?: Date;
    lastUpdate?: Date;
}

export interface FirestoreTimeEntry extends Omit<TimeEntry, 'startTime' | 'endTime' | 'lastPauseTime' | 'createdAt' | 'lastUpdate'> {
    startTime: Timestamp;
    endTime: Timestamp | null;
    lastPauseTime: Timestamp | null;
    createdAt: Timestamp;
    lastUpdate: Timestamp;
} 