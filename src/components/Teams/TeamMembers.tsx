import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import { sendTeamInvitation } from '../../services/teams';
import './TeamMembers.css';

interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  displayName: string;
  email: string;
  role: 'member' | 'admin';
  createdAt: Date;
  lastUpdate: Date;
}

interface TeamMembersProps {
  teamId: string;
}

export const TeamMembers: React.FC<TeamMembersProps> = ({ teamId }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, 'teamMembers'),
        where('teamId', '==', teamId)
      );

      const querySnapshot = await getDocs(q);
      const membersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        lastUpdate: doc.data().lastUpdate.toDate()
      })) as TeamMember[];

      setMembers(membersData);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(t('errors.loadingMembers'));
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess('');

    try {
      await sendTeamInvitation(teamId, email);
      setSuccess(t('teams.inviteSuccess'));
      setEmail('');
      await fetchMembers();
    } catch (err) {
      console.error('Error inviting member:', err);
      setError(t('teams.inviteError'));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm(t('teams.confirmRemoveMember'))) return;

    try {
      // Перевіряємо чи це не останній адмін
      if (members.length === 1) {
        throw new Error(t('errors.cantRemoveLastMember'));
      }

      const member = members.find(m => m.id === memberId);
      if (member?.role === 'admin') {
        const adminCount = members.filter(m => m.role === 'admin').length;
        if (adminCount === 1) {
          throw new Error(t('errors.cantRemoveLastAdmin'));
        }
      }

      await deleteDoc(doc(db, 'teamMembers', memberId));
      await fetchMembers(); // Оновлюємо список
    } catch (err) {
      console.error('Error removing team member:', err);
      setError(err instanceof Error ? err.message : t('errors.removingMember'));
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [teamId]);

  if (loading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="team-members">
      <h3>{t('teams.members')}</h3>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <List className="members-list">
        {members.map((member) => (
          <ListItem key={member.id}>
            <ListItemText
              primary={member.displayName}
              secondary={
                <>
                  <div>{member.email}</div>
                  <div className="member-role">
                    {member.role === 'admin' ? t('teams.roles.admin') : t('teams.roles.member')}
                  </div>
                </>
              }
            />
            {currentUser && (
              members.find(m => m.userId === currentUser.uid)?.role === 'admin' &&
              member.userId !== currentUser.uid && (
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              )
            )}
          </ListItem>
        ))}
      </List>

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
    </div>
  );
};

export default TeamMembers; 