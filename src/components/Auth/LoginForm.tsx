import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField, Button, Typography, Alert, Link } from '@mui/material';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { signInWithGoogle } from '../../services/auth';
import GoogleIcon from '@mui/icons-material/Google';
import './Auth.css';

interface LoginFormProps {
  onSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorCode = err.code;
      const errorMessage = t(`auth.errors.${errorCode}`) || t('auth.errors.default');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error('Google auth error:', err);
      const errorCode = err.code;
      const errorMessage = t(`auth.errors.${errorCode}`) || t('auth.errors.default');
      setError(errorMessage);
    }
  };

  return (
    <div className="auth-container">
      <Typography variant="h5" className="auth-title">
        {isRegistering ? t('auth.register') : t('auth.login')}
      </Typography>

      {error && (
        <Alert severity="error" className="alert">
          {error}
        </Alert>
      )}

      <Button
        variant="outlined"
        fullWidth
        onClick={handleGoogleAuth}
        className="google-button"
        startIcon={<GoogleIcon />}
      >
        {t('auth.continueWithGoogle')}
      </Button>

      <div className="divider">
        <span>{t('auth.or')}</span>
      </div>

      <form onSubmit={handleEmailAuth} className="auth-form">
        <TextField
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          className="form-field"
        />
        <TextField
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          className="form-field"
        />

        {!isRegistering && (
          <Link
            href="/forgot-password"
            className="forgot-password-link"
            underline="hover"
          >
            {t('auth.forgotPassword')}
          </Link>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          className="submit-button"
        >
          {isRegistering ? t('auth.register') : t('auth.login')}
        </Button>
      </form>

      <Button
        onClick={() => setIsRegistering(!isRegistering)}
        className="link-button"
        fullWidth
      >
        {isRegistering ? t('auth.haveAccount') : t('auth.needAccount')}
      </Button>
    </div>
  );
};

export default LoginForm; 