import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';

export interface Team {
  id?: string;
  name: string;
  description?: string;
  userId: string;
  members?: string[]; // Array of user IDs
}

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  const teamsRef = collection(db, 'teams');
  const q = query(teamsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Team));
};

export const getTeamMembers = async (teamId: string): Promise<string[]> => {
  const teamRef = doc(db, 'teams', teamId);
  const teamDoc = await getDoc(teamRef);
  
  if (teamDoc.exists()) {
    const teamData = teamDoc.data() as Team;
    return teamData.members || [];
  }
  
  return [];
};

export const addTeam = async (team: Team): Promise<void> => {
  await addDoc(collection(db, 'teams'), team);
};

export const updateTeam = async (id: string, team: Partial<Team>): Promise<void> => {
  const teamRef = doc(db, 'teams', id);
  await updateDoc(teamRef, team);
};

export const deleteTeam = async (id: string): Promise<void> => {
  const teamRef = doc(db, 'teams', id);
  await deleteDoc(teamRef);
}; 