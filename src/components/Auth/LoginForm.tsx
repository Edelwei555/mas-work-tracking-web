import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { FirebaseError } from 'firebase/app';

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getErrorMessage = (error: any) => {
    console.log('Отримана помилка:', error);
    
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'Ця електронна пошта вже використовується. Спробуйте увійти.';
        case 'auth/weak-password':
          return 'Пароль занадто слабкий. Використовуйте комбінацію літер, цифр та спеціальних символів.';
        case 'auth/invalid-email':
          return 'Невірний формат електронної пошти.';
        case 'auth/user-not-found':
          return 'Користувача з такою електронною поштою не знайдено.';
        case 'auth/wrong-password':
          return 'Невірний пароль.';
        default:
          return `Помилка: ${error.message}`;
      }
    }
    
    return error.message || 'Сталася невідома помилка';
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setError('');
      setIsSubmitting(true);
      console.log('Спроба автентифікації:', { 
        isLogin, 
        email,
        passwordLength: password.length 
      });

      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        if (password.length < 6) {
          throw new Error('Пароль повинен містити щонайменше 6 символів');
        }
        await signUpWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Помилка автентифікації:', err);
      const errorMessage = getErrorMessage(err);
      console.log('Відображаємо помилку:', errorMessage);
      setError(errorMessage);
      
      // Якщо email вже використовується, автоматично переключаємось на форму входу
      if (err instanceof FirebaseError && err.code === 'auth/email-already-in-use') {
        setIsLogin(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;

    try {
      setError('');
      setIsSubmitting(true);
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Помилка Google автентифікації:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="login-form">
      <div className="logo-container">
        <h1 className="auth-logo">Work Tracking</h1>
      </div>
      <h2>{isLogin ? t('auth.signIn') : t('auth.signUp')}</h2>
      
      {error && (
        <div className={`message-box ${error.includes('Спробуйте увійти') ? 'info' : 'error'}`}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleEmailAuth}>
        <div className="form-group">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
            className={error.includes('електронн') ? 'input-error' : ''}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">{t('auth.password')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            minLength={6}
            className={error.includes('пароль') ? 'input-error' : ''}
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting 
            ? t('common.loading') 
            : isLogin 
              ? t('auth.signIn') 
              : t('auth.signUp')
          }
        </button>
      </form>

      <div className="auth-switch">
        <button 
          onClick={toggleMode} 
          className="btn-link"
          disabled={isSubmitting}
        >
          {isLogin ? t('auth.needAccount') : t('auth.alreadyHaveAccount')}
        </button>
      </div>

      <div className="divider">
        <span>{t('auth.or')}</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="btn-google"
        disabled={isSubmitting}
      >
        {isSubmitting ? t('common.loading') : t('auth.googleSignIn')}
      </button>
    </div>
  );
};

export default LoginForm; 