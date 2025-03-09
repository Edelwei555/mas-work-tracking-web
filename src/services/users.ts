import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface User {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastUpdate: Date;
}

interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastUpdate: Timestamp;
}

export const findUserByUid = async (uid: string): Promise<User | null> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('uid', '==', uid)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data() as FirestoreUser;
    
    return {
      id: doc.id,
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      createdAt: data.createdAt.toDate(),
      lastUpdate: data.lastUpdate.toDate()
    };
  } catch (error) {
    console.error('Error finding user:', error);
    throw error;
  }
};

export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'lastUpdate'>): Promise<string> => {
  try {
    const firestoreUser: FirestoreUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      createdAt: Timestamp.now(),
      lastUpdate: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'users'), firestoreUser);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const ensureUserExists = async (
  uid: string, 
  email: string, 
  displayName: string, 
  photoURL?: string
): Promise<User> => {
  try {
    const existingUser = await findUserByUid(uid);
    if (existingUser) {
      return existingUser;
    }

    const userId = await createUser({
      uid,
      email,
      displayName,
      photoURL
    });

    return {
      id: userId,
      uid,
      email,
      displayName,
      photoURL,
      createdAt: new Date(),
      lastUpdate: new Date()
    };
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    throw error;
  }
}; 