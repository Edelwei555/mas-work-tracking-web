import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

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
      setError('Помилка при завантаженні списку учасників');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      // Перевіряємо чи це не останній адмін
      if (members.length === 1) {
        throw new Error('Не можна видалити останнього учасника команди');
      }

      const member = members.find(m => m.id === memberId);
      if (member?.role === 'admin') {
        const adminCount = members.filter(m => m.role === 'admin').length;
        if (adminCount === 1) {
          throw new Error('Не можна видалити останнього адміністратора');
        }
      }

      await deleteDoc(doc(db, 'teamMembers', memberId));
      await fetchMembers(); // Оновлюємо список
    } catch (err) {
      console.error('Error removing team member:', err);
      setError(err instanceof Error ? err.message : 'Помилка при видаленні учасника');
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [teamId]);

  if (loading) {
    return <div>Завантаження...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Учасники команди</h2>
      <div className="space-y-2">
        {members.map(member => (
          <div 
            key={member.id} 
            className="flex items-center justify-between p-3 bg-white rounded-lg shadow"
          >
            <div>
              <div className="font-medium">{member.displayName}</div>
              <div className="text-sm text-gray-500">{member.email}</div>
              <div className="text-xs text-gray-400">
                {member.role === 'admin' ? 'Адміністратор' : 'Учасник'}
              </div>
            </div>
            {currentUser && (
              members.find(m => m.userId === currentUser.uid)?.role === 'admin' &&
              member.userId !== currentUser.uid && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                >
                  Видалити
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 