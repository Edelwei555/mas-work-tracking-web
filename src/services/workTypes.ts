import { 
  collection, 
  addDoc, 
  query, 
  getDocs, 
  updateDoc,
  deleteDoc,
  doc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface WorkType {
  id?: string;
  name: string;
  teamId: string;
  createdBy: string;
}

export const addWorkType = async (workType: Omit<WorkType, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'workTypes'), workType);
    return docRef.id;
  } catch (error) {
    console.error('Error adding work type:', error);
    throw error;
  }
};

export const getTeamWorkTypes = async (teamId: string) => {
  try {
    const q = query(
      collection(db, 'workTypes'),
      where('teamId', '==', teamId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WorkType[];
  } catch (error) {
    console.error('Error getting work types:', error);
    throw error;
  }
};

export const updateWorkType = async (id: string, workType: Partial<WorkType>) => {
  try {
    const workTypeRef = doc(db, 'workTypes', id);
    await updateDoc(workTypeRef, workType);
  } catch (error) {
    console.error('Error updating work type:', error);
    throw error;
  }
};

export const deleteWorkType = async (id: string) => {
  try {
    const workTypeRef = doc(db, 'workTypes', id);
    await deleteDoc(workTypeRef);
  } catch (error) {
    console.error('Error deleting work type:', error);
    throw error;
  }
}; 