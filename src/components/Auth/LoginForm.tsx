import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(t('auth.error') || 'Authentication failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithGoogle();
    } catch (err) {
      setError(t('auth.error') || 'Failed to sign in with Google');
    }
  };

  return (
    <div className="login-form">
      <div className="logo-container">
        <h1 className="auth-logo">Work Tracking</h1>
      </div>
      <h2>{isLogin ? t('auth.signIn') : t('auth.signUp')}</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleEmailAuth}>
        <div className="form-group">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          />
        </div>

        <button type="submit" className="btn-primary">
          {isLogin ? t('auth.signIn') : t('auth.signUp')}
        </button>
      </form>

      <div className="auth-switch">
        <button 
          onClick={() => setIsLogin(!isLogin)} 
          className="btn-link"
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
      >
        {t('auth.googleSignIn')}
      </button>
    </div>
  );
};

export default LoginForm; 