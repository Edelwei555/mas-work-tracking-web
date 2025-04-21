import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createTeamMember } from './teamMembers';

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await checkAndProcessTeamInvites(userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Створюємо документ користувача
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: email,
      createdAt: new Date().toISOString(),
    });

    // Перевіряємо наявність запрошень
    await checkAndProcessTeamInvites(userCredential.user);
    
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Нова функція для перевірки та обробки запрошень
const checkAndProcessTeamInvites = async (user: User) => {
  try {
    console.log('Checking team invites for:', user.email);
    
    // Шукаємо активні запрошення для цього email
    const invitesQuery = query(
      collection(db, 'teamJoinRequests'),
      where('email', '==', user.email),
      where('status', '==', 'pending')
    );
    
    const invitesSnapshot = await getDocs(invitesQuery);
    
    // Обробляємо кожне запрошення
    for (const invite of invitesSnapshot.docs) {
      const inviteData = invite.data();
      console.log('Processing invite for team:', inviteData.teamName);
      
      try {
        // Додаємо користувача до команди
        await createTeamMember(user, inviteData.teamId, 'member');
        
        // Оновлюємо статус запрошення
        await setDoc(doc(db, 'teamJoinRequests', invite.id), {
          ...inviteData,
          status: 'accepted',
          acceptedAt: new Date().toISOString()
        });
        
        console.log('Successfully joined team:', inviteData.teamName);
      } catch (error) {
        console.error('Error processing team invite:', error);
      }
    }
  } catch (error) {
    console.error('Error checking team invites:', error);
  }
};

// Експортуємо для можливого використання в інших місцях
export const checkInvites = checkAndProcessTeamInvites;

// Слухач зміни стану авторизації
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
}; 