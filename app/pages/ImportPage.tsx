import React, { useState } from 'react';

interface ImportPageProps {
  onSuccess: (userUrl: string, castUrl: string) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({ onSuccess }) => {
  // ログアウト時にクリアされるよう、初期値は空。URLは毎回入力または同期後にRepositoryに保持される
  const [userUrl, setUserUrl] = useState('');
  const [castUrl, setCastUrl] = useState('');

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--discord-bg-dark)',
    borderRadius: '8px',
    padding: '24px 32px',
    maxWidth: '600px',
    margin: '24px auto',
    border: '1px solid var(--discord-border)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--discord-text-muted)',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--discord-bg-dark)',
    border: '1px solid var(--discord-border)',
    padding: '10px 12px',
    borderRadius: '4px',
    color: 'var(--discord-text-normal)',
    fontSize: '16px',
    marginBottom: '20px',
    outline: 'none',
  };

  return (
    <div className="page-wrapper">
      <div style={cardStyle}>
        <h2 className="page-header-title page-header-title--md">外部連携設定</h2>
        <p
          className="page-header-subtitle"
          style={{ fontSize: '14px', marginBottom: '24px' }}
        >
          スプレッドシートのURLを同期します。
        </p>

        <label style={labelStyle}>応募者名簿 URL</label>
        <input style={inputStyle} value={userUrl} onChange={(e) => setUserUrl(e.target.value)} />

        <label style={labelStyle}>キャストリスト URL</label>
        <input style={inputStyle} value={castUrl} onChange={(e) => setCastUrl(e.target.value)} />

        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => onSuccess(userUrl, castUrl)}
        >
          保存して同期を開始
        </button>
      </div>
    </div>
  );
};

