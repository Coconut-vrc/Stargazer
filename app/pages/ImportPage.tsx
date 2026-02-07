import React, { useState } from 'react';
import { DiscordColors } from '../common/types/discord-colors';

interface ImportPageProps {
  onSuccess: (userUrl: string, castUrl: string) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({ onSuccess }) => {
  const [userUrl, setUserUrl] = useState('https://docs.google.com/spreadsheets/d/1-1bz7LuxCPADoWCEj24TL6QmOMPzvhmUeUtCiZLp2jo/edit');
  const [castUrl, setCastUrl] = useState('https://docs.google.com/spreadsheets/d/1rc_QdWi805TaZ_2e8uV_odpc4DRQNVnC5ET6W63LzPw/edit');

  const cardStyle: React.CSSProperties = {
    backgroundColor: DiscordColors.bgDark,
    borderRadius: '8px',
    padding: '24px 32px',
    maxWidth: '600px',
    margin: '24px auto',
    border: `1px solid ${DiscordColors.border}`,
  };

  const labelStyle: React.CSSProperties = {
    color: DiscordColors.textMuted,
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: DiscordColors.bgDark,
    border: `1px solid ${DiscordColors.border}`,
    padding: '10px 12px',
    borderRadius: '4px',
    color: DiscordColors.textNormal,
    fontSize: '16px',
    marginBottom: '20px',
    outline: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: DiscordColors.accentBlue,
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={{ padding: '24px 16px' }}>
      <div style={cardStyle}>
        <h2 style={{ color: DiscordColors.textHeader, fontSize: '20px', marginBottom: '4px' }}>
          外部連携設定
        </h2>
        <p style={{ color: DiscordColors.textMuted, fontSize: '14px', marginBottom: '24px' }}>
          スプレッドシートのURLを同期します。
        </p>

        <label style={labelStyle}>応募者名簿 URL</label>
        <input style={inputStyle} value={userUrl} onChange={(e) => setUserUrl(e.target.value)} />

        <label style={labelStyle}>キャストリスト URL</label>
        <input style={inputStyle} value={castUrl} onChange={(e) => setCastUrl(e.target.value)} />

        <button
          style={buttonStyle}
          onClick={() => onSuccess(userUrl, castUrl)}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#4752c4'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = DiscordColors.accentBlue; }}
        >
          保存して同期を開始
        </button>
      </div>
    </div>
  );
};
