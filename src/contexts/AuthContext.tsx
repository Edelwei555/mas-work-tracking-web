import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Auth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';

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

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(firebaseAuth);
        if (result) {
          console.log('Успішна автентифікація після редіректу:', {
            email: result.user.email,
            displayName: result.user.displayName,
            uid: result.user.uid
          });
        }
      } catch (error: any) {
        console.error('Помилка при обробці результату редіректу:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
      }
    };

    handleRedirectResult();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('Починаємо Google автентифікацію...');
      
      const provider = new GoogleAuthProvider();
      console.log('Google провайдер створено');
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      console.log('Встановлено параметри провайдера');
      
      console.log('Починаємо редірект на сторінку автентифікації Google...');
      await signInWithRedirect(firebaseAuth, provider);
      console.log('Редірект виконано');
    } catch (error: any) {
      console.error('Помилка Google автентифікації:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Починаємо email автентифікацію...');
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Успішна email автентифікація:', result.user.email);
    } catch (error: any) {
      console.error('Помилка email автентифікації:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('Починаємо реєстрацію через email...');
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Успішна реєстрація:', result.user.email);
    } catch (error: any) {
      console.error('Помилка реєстрації:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Починаємо вихід з системи...');
      await firebaseSignOut(firebaseAuth);
      console.log('Успішний вихід з системи');
    } catch (error: any) {
      console.error('Помилка виходу з системи:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('Встановлюємо слухача зміни стану автентифікації...');
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      console.log('Зміна стану автентифікації:', user ? `Користувач ${user.email}` : 'Не авторизований');
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      console.log('Видаляємо слухача зміни стану автентифікації');
      unsubscribe();
    };
  }, []);

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