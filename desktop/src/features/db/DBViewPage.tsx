import React, { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '@/stores/AppContext';
import type { UserBean } from '@/stores/AppContext';
import { DiscordTable, DiscordTableColumn } from '@/components/DiscordTable';
import { ConfirmModal } from '@/components/ConfirmModal';
import { isCautionUser, isNGException, computeAutoCautionUsers } from '@/features/matching/logics/caution-user';

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
  const { repository, setActivePage, matchingSettings } = useAppContext();
  const userData = repository.getAllApplyUsers();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<UserBean | null>(null);

  const casts = repository.getAllCasts();
  const cautionList = useMemo(() => {
    const auto = computeAutoCautionUsers(
      casts,
      userData,
      matchingSettings.ngJudgmentType,
      matchingSettings.caution.autoRegisterThreshold,
    );
    const manual = matchingSettings.caution.cautionUsers.filter((c) => c.registrationType === 'manual');
    const key = (u: { username: string; accountId: string }) => `${u.username.trim().toLowerCase()}::${u.accountId.trim().toLowerCase()}`;
    const seen = new Set<string>();
    const out: typeof manual = [];
    for (const m of manual) {
      const k = key(m);
      if (!seen.has(k)) { seen.add(k); out.push(m); }
    }
    for (const a of auto) {
      const k = key(a);
      if (!seen.has(k)) { seen.add(k); out.push(a); }
    }
    return out;
  }, [casts, userData, matchingSettings.caution.cautionUsers, matchingSettings.caution.autoRegisterThreshold, matchingSettings.ngJudgmentType]);

  const showCautionWarning = cautionList.length > 0 && userData.some(
    (u) => isCautionUser(u, cautionList) && !isNGException(u, matchingSettings.ngExceptions.exceptions),
  );

  const handleRemoveFromList = useCallback(() => {
    if (!confirmRemoveUser) return;
    const next = userData.filter(
      (u) => !(u.x_id === confirmRemoveUser.x_id && u.name === confirmRemoveUser.name),
    );
    repository.saveApplyUsers(next);
    setConfirmRemoveUser(null);
  }, [confirmRemoveUser, userData, repository]);

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
        <td colSpan={7} className="table-cell" style={{ padding: '32px', textAlign: 'center', color: 'var(--discord-text-muted)' }}>
          データがありません。左メニューの「データ読取」からCSVファイルを取り込んでください。
        </td>
      </tr>
    ),
    [],
  );

  const rowCellStyle = useCallback(
    (user: UserBean) => {
      const isCaution =
        isCautionUser(user, cautionList) && !isNGException(user, matchingSettings.ngExceptions.exceptions);
      return isCaution ? { ...cellStyle, backgroundColor: 'rgba(237, 66, 69, 0.15)' } : cellStyle;
    },
    [cellStyle, cautionList, matchingSettings.ngExceptions.exceptions],
  );

  const columns: DiscordTableColumn<(typeof userData)[number]>[] = useMemo(
    () => [
      {
        header: '名前',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={rowCellStyle(user)}>{user.name}</td>,
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
          <XLinkCell xId={user.x_id} baseStyle={rowCellStyle(user)} onConfirmOpen={handleConfirmOpen} />
        ),
      },
      {
        header: '希望1',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={rowCellStyle(user)}>{user.casts[0] || '—'}</td>,
      },
      {
        header: '希望2',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={rowCellStyle(user)}>{user.casts[1] || '—'}</td>,
      },
      {
        header: '希望3',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => <td style={rowCellStyle(user)}>{user.casts[2] || '—'}</td>,
      },
      {
        header: '意気込み',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => (
          <td
            style={{
              ...rowCellStyle(user),
              color: 'var(--discord-text-muted)',
              fontSize: '11px',
            }}
          >
            {user.note}
          </td>
        ),
      },
      {
        header: '',
        headerStyle: tableHeaderStyle,
        renderCell: (user) => {
          const isCaution =
            isCautionUser(user, cautionList) && !isNGException(user, matchingSettings.ngExceptions.exceptions);
          return (
            <td style={rowCellStyle(user)}>
              {isCaution ? (
                <button
                  type="button"
                  onClick={() => setConfirmRemoveUser(user)}
                  className="db-view-remove-caution-btn"
                  title="このユーザーをリストから削除"
                  aria-label="リストから削除"
                >
                  ❌
                </button>
              ) : (
                '—'
              )}
            </td>
          );
        },
      },
    ],
    [cellStyle, tableHeaderStyle, rowCellStyle, cautionList, matchingSettings.ngExceptions.exceptions],
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

      {showCautionWarning && (
        <div
          className="banner-muted"
          role="alert"
          style={{
            marginBottom: 16,
            borderLeft: '4px solid var(--discord-text-danger)',
            backgroundColor: 'rgba(237, 66, 69, 0.1)',
          }}
        >
          要注意人物が含まれています。該当行は赤でマークされ、右端の❌からリストから削除できます。NG例外に登録したユーザーは警告されません。
        </div>
      )}

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

      {confirmRemoveUser && (
        <ConfirmModal
          message="このユーザーをリストから削除しますか？"
          onConfirm={handleRemoveFromList}
          onCancel={() => setConfirmRemoveUser(null)}
          confirmLabel="削除する"
          type="confirm"
        />
      )}
    </div>
  );
};

export const DBViewPage = React.memo(DBViewPageComponent);