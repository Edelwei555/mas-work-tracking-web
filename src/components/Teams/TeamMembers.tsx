import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import { sendTeamInvitation } from '../../services/teams';
import './TeamMembers.css';
import { useParams } from 'react-router-dom';
import { auth } from '../../firebase';
import { updateTeamMemberRole, removeTeamMember } from '../../services/teamMembers';
import { getPendingTimeEntries, cleanUserPendingEntries } from '../../services/timeTracking';

interface TeamMembersProps {
  teamId?: string;
}

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  name?: string;
  role: 'admin' | 'member';
}

export const TeamMembers: React.FC<TeamMembersProps> = (props) => {
  const { teamId: urlTeamId } = useParams<{ teamId: string }>();
  const teamId = props.teamId || urlTeamId;
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<{ [userId: string]: number }>({});
  const { t } = useTranslation();

  useEffect(() => {
    if (!teamId || !auth.currentUser) return;

    const checkAdminStatus = async () => {
      try {
        const memberDoc = await getDocs(
          query(
            collection(db, 'teamMembers'),
            where('teamId', '==', teamId),
            where('userId', '==', auth.currentUser!.uid)
          )
        );
        if (!memberDoc.empty) {
          const currentUserRole = memberDoc.docs[0].data().role;
          setIsAdmin(currentUserRole === 'admin');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    checkAdminStatus();
    setLoading(true);

    const unsubscribe = onSnapshot(
      query(collection(db, 'teamMembers'), where('teamId', '==', teamId)),
      (snapshot) => {
        const membersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TeamMember));
        setMembers(membersList);
        setLoading(false);
        // Окремий асинхронний виклик для підрахунку pending
        (async () => {
          const counts: { [userId: string]: number } = {};
          await Promise.all(membersList.map(async (member) => {
            try {
              const entries = await getPendingTimeEntries(member.userId);
              counts[member.userId] = entries.length;
            } catch {
              counts[member.userId] = 0;
            }
          }));
          setPendingCounts(counts);
        })();
      }
    );
    return () => unsubscribe();
  }, [teamId]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;

    try {
      setError(null);
      await sendTeamInvitation(teamId, newMemberEmail);
      setNewMemberEmail('');
      setSuccessMessage('Запрошення успішно відправлено');
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err instanceof Error ? err.message : 'Помилка при надсиланні запрошення');
    }
  };

  const handleRoleToggle = async (userId: string, currentRole: 'admin' | 'member') => {
    try {
      if (!teamId) return;
      setError(null);
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      console.log(`Changing role for user ${userId} from ${currentRole} to ${newRole}`);
      await updateTeamMemberRole(teamId, userId, newRole);
    } catch (err) {
      console.error('Error in handleRoleToggle:', err);
      setError(err instanceof Error ? err.message : 'Помилка при зміні ролі користувача');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      if (!teamId) return;
      setError(null);
      console.log(`Removing user ${userId} from team ${teamId}`);
      await removeTeamMember(teamId, userId);
    } catch (err) {
      console.error('Error in handleRemoveMember:', err);
      setError(err instanceof Error ? err.message : 'Помилка при видаленні учасника');
    }
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div className="team-members">
      <h2>{t('teams.title')}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-item">
            <div className="member-info">
              <div className="member-role">
                {member.role === 'admin' ? t('teams.roles.admin') : t('teams.roles.member')}
              </div>
              <div className="member-name">{member.displayName || member.name}</div>
              <div className="member-email">{member.email}</div>
              <div className="member-pending">
                {t('teams.pendingEntries', 'Відкладені записи')}: {pendingCounts[member.userId] ?? 0}
                {isAdmin && (
                  <button
                    onClick={async () => {
                      await cleanUserPendingEntries(member.userId);
                      const entries = await getPendingTimeEntries(member.userId);
                      setPendingCounts(prev => ({ ...prev, [member.userId]: entries.length }));
                    }}
                    className="button-clean"
                    style={{ marginLeft: 8 }}
                  >
                    Очистити
                  </button>
                )}
              </div>
            </div>
            
            {isAdmin && auth.currentUser && member.userId !== auth.currentUser.uid && (
              <div className="member-actions">
                <button
                  onClick={() => handleRoleToggle(member.userId, member.role)}
                  className={member.role === 'admin' ? 'button-warning' : 'button-success'}
                >
                  {member.role === 'admin' ? t('teams.removeAdmin', 'Зняти права адміністратора') : t('teams.makeAdmin', 'Надати права адміністратора')}
                </button>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="button-danger"
                >
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="invite-form">
          <input
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder={t('teams.inviteEmail')}
            className="email-input"
          />
          <button onClick={handleInvite} className="button-primary">
            {t('teams.addMember')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamMembers; 
