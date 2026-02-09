// F:\DEVELOPFOLDER\dev-core\pages\LoginPage.tsx
import React, { useState } from 'react';
import { DiscordColors } from '../common/types/discord-colors';

export const LoginPage: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      onLoginSuccess();
    } else {
      setError('パスワードが間違っています');
    }
  };

  return (
    <div style={{
      backgroundColor: DiscordColors.bgDark,
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: DiscordColors.bgSecondary,
        padding: '32px',
        borderRadius: '8px',
        width: '400px',
        textAlign: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <p style={{ color: DiscordColors.textMuted, marginBottom: '20px' }}>管理用パスワードを入力してください</p>
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: DiscordColors.bgDark,
            border: `1px solid ${error ? DiscordColors.accentRed : DiscordColors.border}`,
            borderRadius: '4px',
            color: DiscordColors.textNormal,
            marginBottom: '16px',
            outline: 'none'
          }}
        />
        
        {error && <p style={{ color: DiscordColors.accentRed, fontSize: '12px', marginBottom: '16px' }}>{error}</p>}
        
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: DiscordColors.accentBlue,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ログイン
        </button>
      </div>
    </div>
  );
};