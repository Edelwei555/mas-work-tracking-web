import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile, updatePassword } from 'firebase/auth';
import { TextField, Button, Paper, Typography, Box, Alert } from '@mui/material';
import { updateTeamMemberDisplayName } from '../../services/teamMembers';
import './Profile.css';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: displayName
        });
        
        // Оновлюємо ім'я в колекції teamMembers
        await updateTeamMemberDisplayName(currentUser.uid, displayName);
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error(t('profile.passwordsDoNotMatch'));
        }
        await updatePassword(currentUser, newPassword);
      }

      setSuccess(t('profile.updateSuccess'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error updating profile:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper className="profile-container">
      <Typography variant="h5" component="h2" gutterBottom>
        {t('profile.title')}
      </Typography>

      {error && <Alert severity="error" className="alert">{error}</Alert>}
      {success && <Alert severity="success" className="alert">{success}</Alert>}

      <form onSubmit={handleUpdateProfile}>
        <Box className="form-group">
          <TextField
            label={t('profile.displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Box>

        <Box className="form-group">
          <TextField
            type="password"
            label={t('profile.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            variant="outlined"
          />
        </Box>

        {newPassword && (
          <Box className="form-group">
            <TextField
              type="password"
              label={t('profile.confirmPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              variant="outlined"
            />
          </Box>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          fullWidth
        >
          {t('profile.save')}
        </Button>
      </form>
    </Paper>
  );
};

export default Profile; 