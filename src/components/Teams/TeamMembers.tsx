import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import { sendTeamInvitation, removeTeamMember } from '../../services/teams';
import './TeamMembers.css';

interface TeamMembersProps {
  teamId: string;
  members: Array<{
    id: string;
    email: string;
    role: string;
  }>;
  onUpdate: () => void;
}

const TeamMembers: React.FC<TeamMembersProps> = ({ teamId, members, onUpdate }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await sendTeamInvitation(teamId, email);
      setSuccess(t('teams.inviteSuccess'));
      setEmail('');
      onUpdate();
    } catch (err) {
      setError(t('teams.inviteError'));
      console.error('Error inviting member:', err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm(t('teams.confirmRemoveMember'))) return;

    try {
      await removeTeamMember(teamId, memberId);
      onUpdate();
    } catch (err) {
      setError(t('teams.removeMemberError'));
      console.error('Error removing member:', err);
    }
  };

  return (
    <div className="team-members">
      <h3>{t('teams.members')}</h3>
      
      <form onSubmit={handleInvite} className="invite-form">
        <TextField
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          label={t('teams.inviteEmail')}
          variant="outlined"
          fullWidth
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<EmailIcon />}
        >
          {t('teams.invite')}
        </Button>
      </form>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <List className="members-list">
        {members.map((member) => (
          <ListItem key={member.id}>
            <ListItemText
              primary={member.email}
              secondary={t(`teams.roles.${member.role}`)}
            />
            <ListItemSecondaryAction>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleRemoveMember(member.id)}
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default TeamMembers; 