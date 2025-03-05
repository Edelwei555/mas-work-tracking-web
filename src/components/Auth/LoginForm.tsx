import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      await signInWithEmail(email, password);
    } catch (err) {
      setError(t('auth.error') || 'Failed to sign in');
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
      <h2>{t('auth.signIn')}</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleEmailLogin}>
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
          {t('auth.signIn')}
        </button>
      </form>

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