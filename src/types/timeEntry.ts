import { Timestamp } from 'firebase/firestore';

export interface TimeEntry {
    id?: string;
    userId: string;
    teamId: string;
    workTypeId: string;
    locationId: string;
    startTime: Date;
    endTime: Date | null;
    pausedTime: number;
    lastPauseTime: Date | null;
    isRunning: boolean;
    workAmount?: number;
    duration: number;
    createdAt: Date;
    lastUpdate: Date;
    status: 'pending' | 'completed';
}

export interface PendingTimeEntry extends TimeEntry {
    status: 'pending';
}

export interface FirestoreTimeEntry {
    id?: string;
    userId: string;
    teamId: string;
    workTypeId: string;
    locationId: string;
    startTime: Timestamp;
    endTime: Timestamp | null;
    pausedTime: number;
    lastPauseTime: Timestamp | null;
    isRunning: boolean;
    workAmount?: number;
    duration: number;
    createdAt: Timestamp;
    lastUpdate: Timestamp;
    status: 'pending' | 'completed';
} 