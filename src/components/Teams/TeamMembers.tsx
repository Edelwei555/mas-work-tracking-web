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

interface TeamMembersProps {
  teamId?: string;
}

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  name: string;
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;

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
    if (!teamId) return;
    
    try {
      setError(null);
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      await updateTeamMemberRole(teamId, userId, newRole);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Помилка при зміні ролі користувача');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;
    
    try {
      setError(null);
      await removeTeamMember(teamId, userId);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Помилка при видаленні користувача');
    }
  };

  if (loading) return <div>Завантаження...</div>;

  return (
    <div className="team-members-container">
      <h2 className="section-title">Учасники команди</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="members-list">
        {members.map(member => (
          <div key={member.id} className="member-card">
            <div className="member-info">
              <div className="member-primary">
                <span className="member-name">{member.name}</span>
                <span className={`member-role ${member.role}`}>
                  {member.role === 'admin' ? 'Адміністратор' : 'Учасник'}
                </span>
              </div>
              <span className="member-email">{member.email}</span>
            </div>
            
            {isAdmin && auth.currentUser && member.userId !== auth.currentUser.uid && (
              <div className="member-actions">
                <button
                  onClick={() => handleRoleToggle(member.userId, member.role)}
                  className={`button ${member.role === 'admin' ? 'secondary' : 'primary'}`}
                >
                  {member.role === 'admin' ? 'Зняти права адміністратора' : 'Надати права адміністратора'}
                </button>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="button danger"
                >
                  Видалити
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <form onSubmit={handleInvite} className="invite-form">
          <input
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="Email учасника"
            className="input"
            required
          />
          <button type="submit" className="button primary">
            Запросити
          </button>
        </form>
      )}
    </div>
  );
};

export default TeamMembers; 