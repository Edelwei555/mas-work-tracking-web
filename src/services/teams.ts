import { db, functions } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { createTeamMember } from './teamMembers';
import { getAuth } from 'firebase/auth';

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
    
    // Спочатку шукаємо команди користувача
    const q = query(collection(db, 'teams'), where('createdBy', '==', userId));
    const querySnapshot = await getDocs(q);
    const userTeams = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));

    console.log('Found user teams:', userTeams);
    
    if (userTeams.length > 0) {
      return userTeams;
    }

    // Якщо у користувача немає команд, перевіряємо чи він є членом якоїсь команди
    const memberQ = query(
      collection(db, 'teamMembers'),
      where('userId', '==', userId)
    );
    const memberSnapshot = await getDocs(memberQ);
    
    if (!memberSnapshot.empty) {
      const teamIds = memberSnapshot.docs.map(doc => doc.data().teamId);
      console.log('User is member of teams:', teamIds);
      
      const teams = await Promise.all(
        teamIds.map(async (teamId) => {
          const teamDoc = await getDoc(doc(db, 'teams', teamId));
          if (teamDoc.exists()) {
            return {
              id: teamDoc.id,
              ...teamDoc.data()
            } as Team;
          }
          return null;
        })
      );
      
      const validTeams = teams.filter((team): team is Team => team !== null);
      if (validTeams.length > 0) {
        return validTeams;
      }
    }

    // Якщо користувач не має команд і не є членом жодної команди,
    // повертаємо пустий масив
    console.log('User has no teams');
    return [];
    
  } catch (error) {
    console.error('Error getting user teams:', error);
    throw error;
  }
};

export const getTeamMembers = async (teamId: string): Promise<User[]> => {
  try {
    console.log('Getting members for team:', teamId);
    
    const q = query(
      collection(db, 'teamMembers'),
      where('teamId', '==', teamId)
    );
    const querySnapshot = await getDocs(q);
    
    const members = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.userId,
        email: data.email,
        displayName: data.displayName || data.email
      } as User;
    });
    
    console.log('Found team members:', members);
    return members;
  } catch (error) {
    console.error('Error getting team members:', error);
    throw error;
  }
};

export const addTeam = async (team: Team): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'teams'), team);
    
    // Додаємо творця команди як адміністратора
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      await createTeamMember(currentUser, docRef.id, 'admin');
    }
    
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

interface TeamJoinRequestResponse {
  success: boolean;
  requestId: string;
}

export const sendTeamInvitation = async (teamId: string, email: string): Promise<void> => {
  try {
    console.log('Sending team invitation:', { teamId, email });
    
    // Викликаємо Netlify Function
    const response = await fetch('/.netlify/functions/send-team-join-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamId, email })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Function returned error:', error);
      throw new Error(error.error || 'Failed to send invitation');
    }
    
    const result = await response.json();
    console.log('Function result:', result);
    
    if (!result.message) {
      throw new Error('Failed to send invitation');
    }
    
    console.log('Invitation sent successfully');
  } catch (error: any) {
    console.error('Error sending invitation:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.details) {
      console.error('Error details:', error.details);
    }
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