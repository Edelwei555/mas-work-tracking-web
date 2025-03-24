import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { createTeamMember } from '../services/teamMembers';

export const JoinTeam = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processInvite = async () => {
      try {
        console.log('Processing invite with token:', token);
        
        // Шукаємо запрошення за токеном
        const invitesQuery = query(
          collection(db, 'teamJoinRequests'),
          where('token', '==', token),
          where('status', '==', 'pending')
        );
        
        const invitesSnapshot = await getDocs(invitesQuery);
        
        if (invitesSnapshot.empty) {
          setError('Запрошення не знайдено або вже використано');
          setLoading(false);
          return;
        }

        const invite = invitesSnapshot.docs[0];
        const inviteData = invite.data();

        // Перевіряємо, чи користувач авторизований
        const user = auth.currentUser;
        if (!user) {
          // Зберігаємо токен в localStorage і перенаправляємо на логін
          localStorage.setItem('pendingInviteToken', token);
          navigate('/login');
          return;
        }

        // Перевіряємо відповідність email
        if (user.email !== inviteData.email) {
          setError('Це запрошення призначене для іншої адреси email');
          setLoading(false);
          return;
        }

        // Додаємо користувача до команди
        await createTeamMember(user, inviteData.teamId, 'member');
        
        // Оновлюємо статус запрошення
        await updateDoc(doc(db, 'teamJoinRequests', invite.id), {
          status: 'accepted',
          acceptedAt: new Date().toISOString()
        });

        // Перенаправляємо до команди
        navigate(`/teams/${inviteData.teamId}`);
      } catch (error) {
        console.error('Error processing invite:', error);
        setError('Помилка при обробці запрошення');
        setLoading(false);
      }
    };

    if (token) {
      processInvite();
    }
  }, [token, navigate]);

  if (loading) {
    return <div>Обробка запрошення...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return null;
}; 