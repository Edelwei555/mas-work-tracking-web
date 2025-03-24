import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../services/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const user = await signIn(email, password);
      
      // Перевіряємо наявність збереженого токена запрошення
      const pendingInviteToken = localStorage.getItem('pendingInviteToken');
      if (pendingInviteToken) {
        localStorage.removeItem('pendingInviteToken');
        navigate(`/join/${pendingInviteToken}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError('Помилка при вході');
    }
  };

  return (
    <div>Login component</div>
  );
};

export default Login; 