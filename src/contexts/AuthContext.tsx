import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
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

// Перевіряємо, що auth не undefined і правильного типу
const firebaseAuth = auth as Auth;

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const setupAuth = async () => {
      try {
        await setPersistence(firebaseAuth, browserLocalPersistence);
        console.log('Встановлено локальну персистентність');
      } catch (error) {
        console.error('Помилка при налаштуванні персистентності:', error);
      } finally {
        setLoading(false);
      }
    };

    setupAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, 
      (user) => {
        console.log('Зміна стану автентифікації:', {
          isAuthenticated: !!user,
          email: user?.email,
          currentPath: location.pathname,
          timestamp: new Date().toISOString()
        });

        if (user) {
          console.log('Користувач автентифікований:', {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoURL
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
      },
      (error) => {
        console.error('Помилка при зміні стану автентифікації:', error);
      }
    );

    return () => {
      console.log('Відписка від слухача автентифікації');
      unsubscribe();
    };
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