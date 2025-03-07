import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface Team {
  id?: string;
  name: string;
  description?: string;
  userId: string;
  adminId: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: string;
}

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  try {
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, where('adminId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));
  } catch (error) {
    console.error('Error getting teams:', error);
    throw error;
  }
};

export const getTeamMembers = async (teamId: string): Promise<TeamMember[]> => {
  try {
    const membersRef = collection(db, `teams/${teamId}/members`);
    const querySnapshot = await getDocs(membersRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TeamMember));
  } catch (error) {
    console.error('Error getting team members:', error);
    throw error;
  }
};

export const addTeam = async (team: Omit<Team, 'id'>): Promise<string> => {
  try {
    console.log('Спроба створення команди:', {
      ...team,
      adminId: team.adminId
    });

    // Створюємо команду
    const docRef = await addDoc(collection(db, 'teams'), team);
    console.log('Команду створено з ID:', docRef.id);
    
    // Додаємо адміністратора як учасника
    const memberPath = `teams/${docRef.id}/members/${team.adminId}`;
    console.log('Додаємо адміністратора:', memberPath);
    
    await setDoc(doc(db, memberPath), {
      role: 'admin',
      addedAt: new Date()
    });
    console.log('Адміністратора додано як учасника');
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding team:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw error;
  }
};

export const updateTeam = async (id: string, team: Partial<Team>): Promise<void> => {
  try {
    const teamRef = doc(db, 'teams', id);
    await updateDoc(teamRef, team);
  } catch (error) {
    console.error('Error updating team:', error);
    throw error;
  }
};

export const deleteTeam = async (id: string): Promise<void> => {
  try {
    const teamRef = doc(db, 'teams', id);
    await deleteDoc(teamRef);
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
};

export const sendTeamInvitation = async (teamId: string, email: string): Promise<void> => {
  try {
    const functions = getFunctions();
    const sendInvitation = httpsCallable(functions, 'sendTeamInvitation');
    await sendInvitation({ teamId, email });
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw error;
  }
};

export const removeTeamMember = async (teamId: string, memberId: string): Promise<void> => {
  try {
    const memberRef = doc(db, `teams/${teamId}/members/${memberId}`);
    await deleteDoc(memberRef);
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}; 