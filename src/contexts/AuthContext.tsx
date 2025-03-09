import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { ensureUserExists } from '../services/users';
import { ensureTeamMemberExists } from '../services/teamMembers';

// Перевіряємо, що auth не undefined і правильного типу
const firebaseAuth = auth as Auth;

// ID команди за замовчуванням (замініть на ваш ID)
const DEFAULT_TEAM_ID = 'default';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Встановлюємо локальну персистентність
        await setPersistence(firebaseAuth, browserLocalPersistence);
        console.log('Встановлено локальну персистентність');
      } catch (error) {
        console.error('Помилка при встановленні персистентності:', error);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      try {
        if (user) {
          // Створюємо або отримуємо користувача в базі даних
          const dbUser = await ensureUserExists(
            user.uid,
            user.email || '',
            user.displayName || user.email || 'Користувач',
            user.photoURL || undefined
          );
          
          // Додаємо користувача як працівника команди
          await ensureTeamMemberExists(dbUser, DEFAULT_TEAM_ID);
          
          console.log('Користувач автентифікований та доданий як працівник:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          });
          
          setCurrentUser(user);
          
          if (location.pathname === '/login') {
            console.log('Спроба перенаправлення на /time-tracking...');
            try {
              navigate('/time-tracking', { replace: true });
              console.log('Перенаправлення виконано успішно');
            } catch (error) {
              console.error('Помилка при перенаправленні:', error);
            }
          }
        } else {
          console.log('Користувач не автентифікований');
          setCurrentUser(null);
          
          if (location.pathname !== '/login') {
            console.log('Спроба перенаправлення на /login...');
            try {
              navigate('/login', { replace: true });
              console.log('Перенаправлення виконано успішно');
            } catch (error) {
              console.error('Помилка при перенаправленні:', error);
            }
          }
        }
      } catch (error) {
        console.error('Помилка при обробці зміни стану автентифікації:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [navigate, location.pathname]);

  const signInWithGoogle = async () => {
    try {
      console.log('Починаємо Google автентифікацію через popup...');
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(firebaseAuth, provider);
      console.log('Успішна Google автентифікація:', {
        user: result.user.email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Помилка Google автентифікації:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Починаємо вхід через email...', {
        email,
        timestamp: new Date().toISOString()
      });
      
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Успішний вхід через email:', {
        user: result.user.email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Помилка входу через email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('Починаємо реєстрацію через email...', {
        email,
        timestamp: new Date().toISOString()
      });
      
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Успішна реєстрація через email:', {
        user: result.user.email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Помилка реєстрації через email:', {
        error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
      console.log('Успішний вихід');
    } catch (error) {
      console.error('Помилка виходу:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 