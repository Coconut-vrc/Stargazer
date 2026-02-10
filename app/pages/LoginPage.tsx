// F:\DEVELOPFOLDER\dev-core\pages\LoginPage.tsx
import React, { useState } from 'react';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      onLoginSuccess();
    } else {
      const data = await res.json().catch(() => ({}));
      const message = typeof data?.message === 'string' ? data.message : 'パスワードが間違っています';
      setError(message);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--discord-bg-dark)',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="card"
        style={{
          width: '400px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            color: 'var(--discord-text-muted)',
            marginBottom: '20px',
          }}
        >
          管理用パスワードを入力してください
        </p>
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'var(--discord-bg-dark)',
            border: `1px solid ${error ? 'var(--discord-accent-red)' : 'var(--discord-border)'}`,
            borderRadius: '4px',
            color: 'var(--discord-text-normal)',
            marginBottom: '16px',
            outline: 'none'
          }}
        />
        
        {error && <p style={{ color: 'var(--discord-accent-red)', fontSize: '12px', marginBottom: '16px' }}>{error}</p>}
        
        <button
          onClick={handleLogin}
          className="btn-primary"
          style={{ width: '100%' }}
        >
          ログイン
        </button>
      </div>
    </div>
  );
};