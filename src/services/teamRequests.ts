import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

export interface TeamJoinRequest {
  id?: string;
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const createTeamJoinRequest = async (teamId: string): Promise<string> => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('Користувач не авторизований');
  }

  const request: Omit<TeamJoinRequest, 'id'> = {
    teamId,
    userId: user.uid,
    userName: user.displayName || '',
    userEmail: user.email || '',
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'teamJoinRequests'), request);

  // Відправляємо запит на Netlify Function
  const response = await fetch('/.netlify/functions/send-team-join-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({
      requestId: docRef.id,
      teamId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Помилка при відправці запиту');
  }

  return docRef.id;
};

export const getTeamJoinRequests = async (teamId: string): Promise<TeamJoinRequest[]> => {
  const q = query(
    collection(db, 'teamJoinRequests'),
    where('teamId', '==', teamId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TeamJoinRequest));
};

export const getTeamJoinRequest = async (requestId: string): Promise<TeamJoinRequest | null> => {
  const docRef = doc(db, 'teamJoinRequests', requestId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data()
  } as TeamJoinRequest;
};

export const updateTeamJoinRequest = async (requestId: string, status: 'approved' | 'rejected'): Promise<void> => {
  const docRef = doc(db, 'teamJoinRequests', requestId);
  await updateDoc(docRef, {
    status,
    updatedAt: Timestamp.now(),
  });
};

export const getActiveRequest = async (
  userId: string,
  teamId: string
): Promise<TeamJoinRequest | null> => {
  try {
    const q = query(
      collection(db, 'teamJoinRequests'),
      where('userId', '==', userId),
      where('teamId', '==', teamId),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data() as TeamJoinRequest;

    return {
      id: doc.id,
      userId: data.userId,
      teamId: data.teamId,
      userEmail: data.userEmail,
      userName: data.userName,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  } catch (error) {
    console.error('Error getting active request:', error);
    throw error;
  }
};

export const getUserRequests = async (userId: string): Promise<TeamJoinRequest[]> => {
  try {
    const q = query(
      collection(db, 'teamJoinRequests'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TeamJoinRequest));
  } catch (error) {
    console.error('Error getting user requests:', error);
    throw error;
  }
};

export const getTeamRequests = async (teamId: string): Promise<TeamJoinRequest[]> => {
  try {
    const q = query(
      collection(db, 'teamJoinRequests'),
      where('teamId', '==', teamId),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TeamJoinRequest));
  } catch (error) {
    console.error('Error getting team requests:', error);
    throw error;
  }
}; 