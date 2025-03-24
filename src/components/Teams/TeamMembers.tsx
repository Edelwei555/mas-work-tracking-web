import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import { sendTeamInvitation } from '../../services/teams';
import './TeamMembers.css';
import { useParams } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { updateTeamMemberRole, removeTeamMember } from '../../services/teamMembers';

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

export const TeamMembers = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

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
    if (!teamId) {
      setError('ID команди не знайдено');
      return;
    }

    try {
      setError(null);
      await sendTeamInvitation(teamId, newMemberEmail);
      setNewMemberEmail('');
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError('Помилка при надсиланні запрошення');
    }
  };

  const handleRoleToggle = async (userId: string, currentRole: 'admin' | 'member') => {
    if (!teamId) {
      setError('ID команди не знайдено');
      return;
    }
    
    try {
      setError(null);
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      console.log(`Changing role for user ${userId} from ${currentRole} to ${newRole}`);
      await updateTeamMemberRole(teamId, userId, newRole);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Помилка при зміні ролі користувача');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) {
      setError('ID команди не знайдено');
      return;
    }
    
    try {
      setError(null);
      await removeTeamMember(teamId, userId);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Помилка при видаленні користувача');
    }
  };

  useEffect(() => {
    if (!teamId || !currentUser) return;

    // Перевіряємо, чи поточний користувач є адміністратором
    const checkAdminStatus = async () => {
      try {
        const memberDoc = await getDocs(
          query(
            collection(db, 'teamMembers'),
            where('teamId', '==', teamId),
            where('userId', '==', currentUser.uid)
          )
        );
        
        if (!memberDoc.empty) {
          const currentUserRole = memberDoc.docs[0].data().role;
          console.log('Current user role:', currentUserRole);
          setIsAdmin(currentUserRole === 'admin');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    // Підписуємося на оновлення списку учасників
    const unsubscribe = onSnapshot(
      query(collection(db, 'teamMembers'), where('teamId', '==', teamId)),
      (snapshot) => {
        const membersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TeamMember));
        console.log('Members list:', membersList);
        setMembers(membersList);
        setLoading(false);
      }
    );

    checkAdminStatus();
    return () => unsubscribe();
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
        {members.map((member) => {
          // Додаємо логування для кожного учасника
          console.log('Rendering member:', {
            memberId: member.id,
            memberRole: member.role,
            isAdmin,
            currentUserId: currentUser?.uid
          });

          return (
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
              {isAdmin && currentUser && member.userId !== currentUser.uid && (
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleRemoveMember(member.userId)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          );
        })}
      </List>

      {isAdmin && (
        <form onSubmit={handleInvite} className="invite-form">
          <TextField
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
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
      )}
    </div>
  );
};

export default TeamMembers; 