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

export interface Location {
  id?: string;
  name: string;
  description?: string;
  teamId: string;
  createdBy: string;
}

export const addLocation = async (location: Omit<Location, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'locations'), location);
    return docRef.id;
  } catch (error) {
    console.error('Error adding location:', error);
    throw error;
  }
};

export const getTeamLocations = async (teamId: string) => {
  try {
    const q = query(
      collection(db, 'locations'),
      where('teamId', '==', teamId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Location[];
  } catch (error) {
    console.error('Error getting locations:', error);
    throw error;
  }
};

export const updateLocation = async (id: string, location: Partial<Location>) => {
  try {
    const locationRef = doc(db, 'locations', id);
    await updateDoc(locationRef, location);
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

export const deleteLocation = async (id: string) => {
  try {
    const locationRef = doc(db, 'locations', id);
    await deleteDoc(locationRef);
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
}; 