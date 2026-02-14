import React, { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '@/stores/AppContext';
import type { UserBean } from '@/stores/AppContext';
import { DiscordTable, DiscordTableColumn } from '@/components/DiscordTable';
import { ConfirmModal } from '@/components/ConfirmModal';
import { isCautionUser, isNGException, computeAutoCautionUsers } from '@/features/matching/logics/caution-user';
import { openInDefaultBrowser } from '@/common/openExternal';
import { EXTERNAL_LINK } from '@/common/copy';

/**
 * X IDセル専用コンポーネント
 */
const XLinkCell: React.FC<{
  xId: string;
  isCaution: boolean;
  onConfirmOpen: (url: string) => void;
}> = ({ xId, isCaution, onConfirmOpen }) => {
  const handle = xId ? xId.replace(/^@/, '') : '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!handle) return;
    onConfirmOpen(`https://x.com/${handle}`);
  };

  const cls = [
    'db-table__cell',
    isCaution ? 'db-table__cell--caution' : '',
    handle ? 'db-table__cell--link' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <td className={cls} onClick={handleClick}>
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

  const handleOpenUrl = useCallback(async () => {
    if (pendingUrl) {
      await openInDefaultBrowser(pendingUrl);
      setPendingUrl(null);
    }
  }, [pendingUrl]);

  const handleCancelOpen = useCallback(() => {
    setPendingUrl(null);
  }, []);

  const emptyRow = useMemo(
    () => (
      <tr>
        <td colSpan={7} className="db-table__cell db-table__cell--empty">
          データがありません。左メニューの「データ読取」からCSVファイルを取り込んでください。
        </td>
      </tr>
    ),
    [],
  );

  const isCautionRow = useCallback(
    (user: UserBean) =>
      isCautionUser(user, cautionList) && !isNGException(user, matchingSettings.ngExceptions.exceptions),
    [cautionList, matchingSettings.ngExceptions.exceptions],
  );

  const columns: DiscordTableColumn<(typeof userData)[number]>[] = useMemo(
    () => [
      {
        header: '名前',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.name}</td>,
      },
      {
        header: (
          <>
            X ID
            <span className="db-table__th-hint">（クリックでユーザーページに遷移）</span>
          </>
        ),
        headerClassName: 'db-table__th',
        renderCell: (user) => (
          <XLinkCell xId={user.x_id} isCaution={isCautionRow(user)} onConfirmOpen={handleConfirmOpen} />
        ),
      },
      {
        header: '希望1',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.casts[0] || '—'}</td>,
      },
      {
        header: '希望2',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.casts[1] || '—'}</td>,
      },
      {
        header: '希望3',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.casts[2] || '—'}</td>,
      },
      {
        header: '意気込み',
        headerClassName: 'db-table__th',
        renderCell: (user) => (
          <td className={`db-table__cell db-table__cell--note${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>
            {user.note}
          </td>
        ),
      },
      {
        header: '',
        headerClassName: 'db-table__th',
        renderCell: (user) => {
          const caution = isCautionRow(user);
          return (
            <td className={`db-table__cell${caution ? ' db-table__cell--caution' : ''}`}>
              {caution ? (
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
    [isCautionRow, handleConfirmOpen],
  );

  return (
    <div className="page-wrapper">
      <div className="page-header-row">
        <h1 className="page-header-title page-header-title--md">名簿データベース</h1>
        <button
          onClick={() => setActivePage('lotteryCondition')}
          className="btn-accent-yellow"
        >
          抽選条件へ
        </button>
      </div>

      {showCautionWarning && (
        <div
          className="banner-muted banner-muted--danger"
          role="alert"
        >
          要注意人物が含まれています。該当行は赤でマークされ、右端の❌からリストから削除できます。NG例外に登録したユーザーは警告されません。
        </div>
      )}

      <div className="table-container">
        <DiscordTable
          columns={columns}
          rows={userData}
          tableClassName="db-table"
          emptyRow={emptyRow}
        />
      </div>

      {pendingUrl && (
        <ConfirmModal
          type="confirm"
          title={EXTERNAL_LINK.MODAL_TITLE}
          message={`${EXTERNAL_LINK.MODAL_MESSAGE}\n\n${pendingUrl}`}
          confirmLabel={EXTERNAL_LINK.CONFIRM_LABEL}
          cancelLabel={EXTERNAL_LINK.CANCEL_LABEL}
          onConfirm={handleOpenUrl}
          onCancel={handleCancelOpen}
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