import React, { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '../stores/AppContext';
import { DiscordTable, DiscordTableColumn } from '../components/DiscordTable';
import { ConfirmModal } from '../components/ConfirmModal';

/**
 * X IDセル専用コンポーネント
 */
const XLinkCell: React.FC<{
  xId: string;
  baseStyle: React.CSSProperties;
  onConfirmOpen: (url: string) => void;
}> = ({ xId, baseStyle, onConfirmOpen }) => {
  const handle = xId ? xId.replace(/^@/, '') : '';
  const cellStyle: React.CSSProperties = {
    ...baseStyle,
    cursor: handle ? 'pointer' : 'default',
    color: handle ? 'var(--discord-text-link)' : 'var(--discord-text-normal)',
    transition: 'background-color 0.17s ease',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!handle) return;
    onConfirmOpen(`https://x.com/${handle}`);
  };

  return (
    <td
      style={cellStyle}
      onClick={handleClick}
      onMouseEnter={(e) => handle && (e.currentTarget.style.backgroundColor = 'var(--discord-bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {handle ? `@${handle}` : '—'}
    </td>
  );
};

const DBViewPageComponent: React.FC = () => {
  const { repository, setActivePage } = useAppContext();
  const userData = repository.getAllApplyUsers();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const handleConfirmOpen = useCallback((url: string) => {
    setPendingUrl(url);
  }, []);

  const handleOpenUrl = useCallback(() => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank', 'noopener,noreferrer');
      setPendingUrl(null);
    }
  }, [pendingUrl]);

  const handleCancelOpen = useCallback(() => {
    setPendingUrl(null);
  }, []);

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

  const emptyRow = useMemo(
    () => (
      <tr>
        <td colSpan={6} className="table-cell" style={{ padding: '32px', textAlign: 'center', color: 'var(--discord-text-muted)' }}>
          データがありません。左メニューの「データ読取」からスプレッドシートを読み込んでください。
        </td>
      </tr>
    ),
    [],
  );

  const columns: DiscordTableColumn<(typeof userData)[number]>[] = useMemo(
    () => [
      {
        header: '名前',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={cellStyle}>{user.name}</td>,
      },
      {
        header: (
          <>
            X ID
            <span
              style={{
                fontSize: '9px',
                fontWeight: 400,
                color: 'var(--discord-text-muted)',
                marginLeft: '6px',
                fontStyle: 'italic',
              }}
            >
              （クリックでユーザーページに遷移）
            </span>
          </>
        ),
        headerStyle: tableHeaderStyle,
        renderCell: (user) => (
          <XLinkCell xId={user.x_id} baseStyle={cellStyle} onConfirmOpen={handleConfirmOpen} />
        ),
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
        header: '意気込み',
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
    <div className="page-wrapper">
      <div className="page-header-row">
        <h1 className="page-header-title page-header-title--md">名簿データベース</h1>
        <button
          onClick={() => setActivePage('lotteryCondition')}
          className="btn-secondary"
          style={{
            width: 'auto',
            padding: '8px 16px',
            fontSize: '13px',
            backgroundColor: 'var(--discord-accent-yellow)',
            color: '#000',
            border: 'none',
          }}
        >
          抽選条件へ
        </button>
      </div>

      <div className="table-container">
        <DiscordTable
          columns={columns}
          rows={userData}
          containerStyle={undefined}
          tableStyle={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}
          headerRowStyle={undefined}
          emptyRow={emptyRow}
        />
      </div>

      {pendingUrl && (
        <ConfirmModal
          message={`外部サイト（X）に遷移しますか？\n${pendingUrl}`}
          onConfirm={handleOpenUrl}
          onCancel={handleCancelOpen}
          confirmLabel="OK"
          type="confirm"
        />
      )}
    </div>
  );
};

export const DBViewPage = React.memo(DBViewPageComponent);