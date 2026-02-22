import React, { useState, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(null);
  const auth = useContext(AuthContext);
  const nav = useNavigate();

  const submit = async () => {
    setError(null);
    try {
      if (mode === 'login') await auth.login(email, password);
      else await auth.register(email, password);
      nav('/portfolio');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit}>{mode === 'login' ? 'Sign in' : 'Register'}</button>
          <button onClick={()=>setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Have an account?'}</button>
        </div>
      </div>
    </div>
  );
}
