import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
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
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const defaultValue: AuthContextType = {
  currentUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {}
};

const AuthContext = createContext<AuthContextType>(defaultValue);

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
          console.log('User authenticated:', {
            email: user.email,
            timestamp: new Date().toISOString()
          });
          
          // Створюємо або оновлюємо користувача в базі даних
          await ensureUserExists(user);
          
          console.log('User created/found in database:', user);
          
          // Додаємо користувача як працівника команди
          const teamMember = await ensureTeamMemberExists(user, DEFAULT_TEAM_ID);
          
          console.log('Team member created/found:', teamMember);
          
          setCurrentUser(user);
          
          if (location.pathname === '/login') {
            console.log('Redirecting to /time-tracking...');
            navigate('/time-tracking', { replace: true });
          }
        } else {
          console.log('User not authenticated');
          setCurrentUser(null);
          
          if (location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  const logout = () => {
    return signOut(firebaseAuth);
  };

  const value = {
    currentUser,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 