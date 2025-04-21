import { createContext, useContext, useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, signOut, onAuthStateChanged, UserCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { CircularProgress } from '@mui/material';

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(
      auth, 
      (user) => {
        if (mounted) {
          setCurrentUser(user);
          setLoading(false);
          setInitializing(false);
        }
      },
      (error) => {
        if (mounted) {
          console.error('Auth state change error:', error);
          setError(error.message);
          setLoading(false);
          setInitializing(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const clearError = () => setError(null);

  const value = {
    currentUser,
    loading,
    error,
    clearError,
    signOut: async () => {
      try {
        setLoading(true);
        await signOut(auth);
      } catch (err) {
        console.error('Sign out error:', err);
        setError(err instanceof Error ? err.message : 'Помилка виходу');
      } finally {
        setLoading(false);
      }
    },
    signIn: async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);
        return await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        console.error('Sign in error:', err);
        setError(err instanceof Error ? err.message : 'Помилка входу');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  if (initializing) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <CircularProgress />
        <div>Ініціалізація додатку...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 