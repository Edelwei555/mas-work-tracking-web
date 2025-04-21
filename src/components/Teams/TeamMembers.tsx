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
          console.log('Current user role:', currentUserRole);
          setIsAdmin(currentUserRole === 'admin');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };

    checkAdminStatus();

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

  if (loading) return <div>Завантаження...</div>;

  return (
    <div className="team-members">
      <h2>Учасники команди</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-item">
            <div className="member-info">
              <div className="member-role">
                {member.role === 'admin' ? 'Адміністратор' : 'Учасник'}
              </div>
              <div className="member-name">{member.displayName || member.name}</div>
              <div className="member-email">{member.email}</div>
            </div>
            
            {isAdmin && auth.currentUser && member.userId !== auth.currentUser.uid && (
              <div className="member-actions">
                <button
                  onClick={() => handleRoleToggle(member.userId, member.role)}
                  className={member.role === 'admin' ? 'button-warning' : 'button-success'}
                >
                  {member.role === 'admin' ? 'Зняти права адміністратора' : 'Надати права адміністратора'}
                </button>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="button-danger"
                >
                  Видалити
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
            placeholder="Email учасника"
            className="email-input"
          />
          <button onClick={handleInvite} className="button-primary">
            Запросити
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamMembers; 
