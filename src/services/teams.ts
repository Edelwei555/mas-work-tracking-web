import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface Team {
  id?: string;
  name: string;
  description?: string;
  createdBy: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export const getUserTeams = async (userId: string): Promise<Team[]> => {
  try {
    console.log('Getting teams for user:', userId);
    
    // Спочатку перевіряємо чи є команда за замовчуванням
    const defaultTeamRef = doc(db, 'teams', 'default');
    const defaultTeamDoc = await getDoc(defaultTeamRef);
    
    if (!defaultTeamDoc.exists()) {
      console.log('Creating default team');
      // Створюємо команду за замовчуванням, якщо її немає
      await setDoc(defaultTeamRef, {
        name: 'Default Team',
        description: 'Default team for all users',
        createdBy: userId
      });
      
      return [{
        id: 'default',
        name: 'Default Team',
        description: 'Default team for all users',
        createdBy: userId
      }];
    }
    
    // Повертаємо команду за замовчуванням
    return [{
      id: defaultTeamDoc.id,
      ...defaultTeamDoc.data()
    } as Team];
    
  } catch (error) {
    console.error('Error getting user teams:', error);
    throw error;
  }
};

export const getTeamMembers = async (teamId: string): Promise<User[]> => {
  try {
    const q = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.userId,
        email: data.email,
        displayName: data.displayName
      } as User;
    });
  } catch (error) {
    console.error('Error getting team members:', error);
    throw error;
  }
};

export const addTeam = async (team: Team): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'teams'), team);
    return docRef.id;
  } catch (error) {
    console.error('Error adding team:', error);
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
    await deleteDoc(doc(db, 'teams', id));
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