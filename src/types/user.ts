import { Timestamp } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

export interface User {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastUpdate: Date;
}

export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastUpdate: Timestamp;
}

export interface TeamUser {
  id: string;
  email: string;
  displayName?: string;
}

export type { FirebaseUser }; 