import React, { useMemo } from 'react';
import { useAppContext } from '../stores/AppContext';
import { DiscordTable, DiscordTableColumn } from '../components/DiscordTable';

/**
 * X IDセル専用コンポーネント
 */
const XLinkCell: React.FC<{ xId: string; baseStyle: React.CSSProperties }> = ({ xId, baseStyle }) => {
  const handle = xId? xId.replace(/^@/, '') : '';
  const cellStyle: React.CSSProperties = {
   ...baseStyle,
    cursor: 'pointer',
    color: 'var(--discord-text-link)',
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
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--discord-bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {handle? `@${handle}` : '—'}
    </td>
  );
};

const DBViewPageComponent: React.FC = () => {
  const { repository, setActivePage } = useAppContext();
  const userData = repository.getAllApplyUsers();

  const tableHeaderStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: '11px', // Image 1対応：一回り小さく
    color: 'var(--discord-text-muted)',
    textTransform: 'uppercase',
    fontWeight: 600,
    borderBottom: '1px solid var(--discord-border)',
    backgroundColor: 'var(--discord-bg-sidebar)',
  };

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '12px', // Image 1対応：一回り小さく
    color: 'var(--discord-text-normal)',
    borderBottom: '1px solid var(--discord-border)',
  };

  const columns: DiscordTableColumn<(typeof userData)[number]>[] = useMemo(
    () => [
      {
        header: '名前',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={cellStyle}>{user.name}</td>,
      },
      {
        header: 'X ID',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <XLinkCell xId={user.x_id} baseStyle={cellStyle} />,
      },
      {
        header: '希望1',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={cellStyle}>{user.casts[0] || '—'}</td>,
      },
      {
        header: '希望2',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={cellStyle}>{user.casts[1] || '—'}</td>,
      },
      {
        header: '希望3',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={cellStyle}>{user.casts[2] || '—'}</td>,
      },
      {
        header: '備考',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => (
          <td
            style={{
              ...cellStyle,
              color: 'var(--discord-text-muted)',
              fontSize: '11px',
            }}
          >
            {user.note}
          </td>
        ),
      },
    ],
    [cellStyle, tableHeaderStyle],
  );

  return (
    <div style={{ padding: '20px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'var(--discord-text-header)', fontSize: '20px', margin: 0 }}>名簿データベース</h1>
        <button
          onClick={() => setActivePage('lotteryCondition')}
          style={{
            backgroundColor: 'var(--discord-accent-yellow)',
            color: '#000',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          抽選条件へ
        </button>
      </div>

      <div style={{ 
        backgroundColor: 'var(--discord-bg-dark)', 
        borderRadius: '8px', 
        overflowX: 'auto', // 横スクロール追加
        WebkitOverflowScrolling: 'touch',
        border: '1px solid var(--discord-border)',
      }}>
        <DiscordTable
          columns={columns}
          rows={userData}
          containerStyle={undefined}
          tableStyle={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}
          headerRowStyle={undefined}
          emptyRow={undefined}
        />
      </div>
    </div>
  );
};

export const DBViewPage = React.memo(DBViewPageComponent);