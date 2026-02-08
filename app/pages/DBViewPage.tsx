import React from 'react';
import { useAppContext } from '../stores/AppContext';
import { DiscordColors } from '../common/types/discord-colors';

/**
 * X IDセル専用コンポーネント
 */
const XLinkCell: React.FC<{ xId: string; baseStyle: React.CSSProperties }> = ({ xId, baseStyle }) => {
  const handle = xId? xId.replace(/^@/, '') : '';
  const cellStyle: React.CSSProperties = {
   ...baseStyle,
    cursor: 'pointer',
    color: DiscordColors.textLink,
    transition: 'background-color 0.17s ease',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!handle) return;
    window.open(`https://x.com/${handle}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <td
      style={cellStyle}
      onClick={handleClick}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DiscordColors.itemHover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {handle? `@${handle}` : '—'}
    </td>
  );
};

export const DBViewPage: React.FC = () => {
  const { repository, setActivePage } = useAppContext();
  const userData = repository.getAllApplyUsers();

  const tableHeaderStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '11px', // Image 1対応：一回り小さく
    color: DiscordColors.textMuted,
    textTransform: 'uppercase',
    fontWeight: 600,
    borderBottom: `1px solid ${DiscordColors.border}`,
    backgroundColor: DiscordColors.bgSidebar,
  };

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '12px', // Image 1対応：一回り小さく
    color: DiscordColors.textNormal,
    borderBottom: `1px solid ${DiscordColors.border}`,
  };

  return (
    <div style={{ padding: '20px 12px' }}>
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
            fontSize: '13px',
          }}
        >
          抽選設定へ
        </button>
      </div>

      <div style={{ 
        backgroundColor: DiscordColors.bgDark, 
        borderRadius: '8px', 
        overflowX: 'auto', // 横スクロール追加
        WebkitOverflowScrolling: 'touch',
        border: `1px solid ${DiscordColors.border}` 
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
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
              <tr key={i} style={{ backgroundColor: i % 2 === 0? 'transparent' : DiscordColors.bgAlt }}>
                <td style={cellStyle}>{user.name}</td>
                <XLinkCell xId={user.x_id} baseStyle={cellStyle} />
                <td style={cellStyle}>{user.casts || '—'}</td>
                <td style={cellStyle}>{user.casts[1] || '—'}</td>
                <td style={{...cellStyle, color: DiscordColors.textMuted, fontSize: '11px' }}>{user.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};