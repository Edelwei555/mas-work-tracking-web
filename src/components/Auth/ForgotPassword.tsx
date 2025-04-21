import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { TextField, Button, Typography, Alert } from '@mui/material';
import './Auth.css';

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError('');
      setSuccess('');
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setSuccess(t('auth.resetPasswordSuccess'));
      setEmail('');
    } catch (err) {
      console.error('Error resetting password:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('auth.resetPasswordError'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Typography variant="h5" component="h2" gutterBottom>
        {t('auth.resetPassword')}
      </Typography>

      {error && <Alert severity="error" className="alert">{error}</Alert>}
      {success && <Alert severity="success" className="alert">{success}</Alert>}

      <form onSubmit={handleSubmit} className="auth-form">
        <TextField
          type="email"
          label={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          variant="outlined"
          className="form-field"
        />

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          fullWidth
          className="submit-button"
        >
          {t('auth.sendResetLink')}
        </Button>

        <Button
          href="/login"
          color="inherit"
          fullWidth
          className="link-button"
        >
          {t('auth.backToLogin')}
        </Button>
      </form>
    </div>
  );
};

export default ForgotPassword; 