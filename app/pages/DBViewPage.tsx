import React from 'react';
import { useAppContext } from '../stores/AppContext';
import { DiscordColors } from '../common/types/discord-colors';

export const DBViewPage: React.FC = () => {
  const { repository, setActivePage } = useAppContext();
  const userData = repository.getAllApplyUsers();

  const tableHeaderStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '12px',
    color: DiscordColors.textMuted,
    textTransform: 'uppercase',
    fontWeight: 600,
    borderBottom: `1px solid ${DiscordColors.border}`,
    backgroundColor: DiscordColors.bgSidebar,
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '14px',
    color: DiscordColors.textNormal,
    borderBottom: `1px solid ${DiscordColors.border}`,
  };

  return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: DiscordColors.textHeader, fontSize: '20px', margin: 0 }}>名簿データベース</h1>
        <button
          onClick={() => setActivePage('lottery')}
          style={{
            backgroundColor: DiscordColors.accentYellow,
            color: '#000',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          抽選設定へ進む
        </button>
      </div>

      <div style={{ backgroundColor: DiscordColors.bgDark, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${DiscordColors.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>名前</th>
              <th style={tableHeaderStyle}>X ID</th>
              <th style={tableHeaderStyle}>希望1</th>
              <th style={tableHeaderStyle}>希望2</th>
              <th style={tableHeaderStyle}>備考</th>
            </tr>
          </thead>
          <tbody>
            {userData.map((user, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : DiscordColors.bgAlt }}>
                <td style={cellStyle}>{user.name}</td>
                <td style={{ ...cellStyle, color: DiscordColors.textLink }}>@{user.x_id}</td>
                <td style={cellStyle}>{user.casts[0] ?? '—'}</td>
                <td style={cellStyle}>{user.casts[1] ?? '—'}</td>
                <td style={{ ...cellStyle, color: DiscordColors.textMuted, fontSize: '12px' }}>{user.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
