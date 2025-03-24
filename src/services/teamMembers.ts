import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  updateDoc,
  Timestamp,
  DocumentData,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export interface TeamMember {
  id?: string;
  userId: string;
  teamId: string;
  displayName: string;
  email: string;
  role: 'member' | 'admin';
  createdAt: Date;
  lastUpdate: Date;
}

interface FirestoreTeamMember {
  userId: string;
  teamId: string;
  displayName: string;
  email: string;
  role: 'member' | 'admin';
  createdAt: Timestamp;
  lastUpdate: Timestamp;
}

export const findTeamMemberByUserId = async (userId: string): Promise<TeamMember | null> => {
  try {
    const q = query(
      collection(db, 'teamMembers'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data() as FirestoreTeamMember;
    
    return {
      id: doc.id,
      userId: data.userId,
      teamId: data.teamId,
      displayName: data.displayName,
      email: data.email,
      role: data.role,
      createdAt: data.createdAt.toDate(),
      lastUpdate: data.lastUpdate.toDate()
    };
  } catch (error) {
    console.error('Error finding team member:', error);
    throw error;
  }
};

export const updateTeamMemberDisplayName = async (userId: string, displayName: string): Promise<void> => {
  try {
    const q = query(
      collection(db, 'teamMembers'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const updates = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        displayName,
        lastUpdate: Timestamp.now()
      })
    );

    await Promise.all(updates);
    console.log('Successfully updated team member display name');
  } catch (error) {
    console.error('Error updating team member display name:', error);
    throw error;
  }
};

export const createTeamMember = async (
  user: FirebaseUser,
  teamId: string,
  role: 'member' | 'admin' = 'member'
): Promise<string> => {
  try {
    const firestoreTeamMember: FirestoreTeamMember = {
      userId: user.uid,
      teamId,
      displayName: user.displayName || '',
      email: user.email || '',
      role,
      createdAt: Timestamp.now(),
      lastUpdate: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'teamMembers'), firestoreTeamMember);
    return docRef.id;
  } catch (error) {
    console.error('Error creating team member:', error);
    throw error;
  }
};

export const ensureTeamMemberExists = async (
  user: FirebaseUser,
  teamId: string,
  role: 'member' | 'admin' = 'member'
): Promise<TeamMember> => {
  try {
    const existingMember = await findTeamMemberByUserId(user.uid);
    if (existingMember) {
      return existingMember;
    }

    const memberId = await createTeamMember(user, teamId, role);
    return {
      id: memberId,
      userId: user.uid,
      teamId,
      displayName: user.displayName || '',
      email: user.email || '',
      role,
      createdAt: new Date(),
      lastUpdate: new Date()
    };
  } catch (error) {
    console.error('Error ensuring team member exists:', error);
    throw error;
  }
};

export const updateTeamMemberRole = async (teamId: string, userId: string, role: 'admin' | 'member'): Promise<void> => {
  try {
    console.log(`Updating role for user ${userId} in team ${teamId} to ${role}`);
    const memberDocId = `${teamId}_${userId}`;
    const memberRef = doc(db, 'teamMembers', memberDocId);
    
    await updateDoc(memberRef, {
      role: role,
      updatedAt: new Date().toISOString()
    });
    
    console.log('Role updated successfully');
  } catch (error) {
    console.error('Error updating role:', error);
    throw new Error('Не вдалося змінити роль користувача');
  }
};

export const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  if (!teamId || !userId) {
    throw new Error('TeamId and userId are required');
  }

  try {
    const memberRef = doc(db, 'teamMembers', `${teamId}_${userId}`);
    await deleteDoc(memberRef);
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}; 