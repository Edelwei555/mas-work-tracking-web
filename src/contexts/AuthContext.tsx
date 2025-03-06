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

  // Встановлюємо персистентність при ініціалізації
  useEffect(() => {
    const setupPersistence = async () => {
      try {
        console.log('Налаштування персистентності...');
        await setPersistence(firebaseAuth, browserLocalPersistence);
        console.log('Встановлено локальну персистентність');
      } catch (error) {
        console.error('Помилка встановлення персистентності:', error);
      }
    };
    setupPersistence();
  }, []);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log('Перевіряємо результат редіректу...', {
          pathname: location.pathname,
          search: location.search
        });
        
        const result = await getRedirectResult(firebaseAuth);
        console.log('Отримано результат редіректу:', result ? 'успішно' : 'немає результату');
        
        if (result) {
          console.log('Успішна автентифікація після редіректу:', {
            email: result.user.email,
            displayName: result.user.displayName,
            uid: result.user.uid,
            isAnonymous: result.user.isAnonymous,
            emailVerified: result.user.emailVerified
          });
          
          // Перевіряємо поточний шлях
          if (location.pathname === '/login') {
            console.log('Перенаправляємо на головну сторінку...');
            navigate('/');
          }
        } else {
          console.log('Немає результату редіректу');
        }
      } catch (error: any) {
        console.error('Помилка при обробці результату редіректу:', {
          code: error.code,
          message: error.message,
          stack: error.stack,
          pathname: location.pathname
        });
      }
    };

    handleRedirectResult();
  }, [navigate, location]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      console.log('Починаємо Google автентифікацію...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
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
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Починаємо email автентифікацію...');
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Успішна email автентифікація:', result.user.email);
      navigate('/');
    } catch (error: any) {
      console.error('Помилка email автентифікації:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('Починаємо реєстрацію через email...');
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      console.log('Успішна реєстрація:', result.user.email);
      navigate('/');
    } catch (error: any) {
      console.error('Помилка реєстрації:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('Починаємо вихід з системи...');
      await firebaseSignOut(firebaseAuth);
      console.log('Успішний вихід з системи');
      navigate('/login');
    } catch (error: any) {
      console.error('Помилка виходу з системи:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('Встановлюємо слухача зміни стану автентифікації...');
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      console.log('Зміна стану автентифікації:', {
        isAuthenticated: !!user,
        email: user?.email,
        emailVerified: user?.emailVerified,
        isAnonymous: user?.isAnonymous,
        currentPath: location.pathname
      });
      
      setCurrentUser(user);
      setLoading(false);
      
      // Якщо користувач не авторизований і не на сторінці логіну, перенаправляємо на логін
      if (!user && location.pathname !== '/login') {
        console.log('Перенаправляємо на сторінку логіну...');
        navigate('/login');
      }
    });

    return () => {
      console.log('Видаляємо слухача зміни стану автентифікації');
      unsubscribe();
    };
  }, [navigate, location]);

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