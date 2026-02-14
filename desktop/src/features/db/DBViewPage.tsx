import React, { useMemo, useState, useCallback } from 'react';
import { useAppContext } from '@/stores/AppContext';
import type { UserBean } from '@/stores/AppContext';
import { DiscordTable, DiscordTableColumn } from '@/components/DiscordTable';
import { ConfirmModal } from '@/components/ConfirmModal';
import { isCautionUser, computeAutoCautionUsers } from '@/features/matching/logics/caution-user';
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
  const [showOtherData, setShowOtherData] = useState(false);
  // 各列の表示/非表示設定
  const [columnVisibility, setColumnVisibility] = useState({
    name: true,
    vrcUrl: true,
    xId: true,
    cast1: true,
    cast2: true,
    cast3: true,
  });

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
    (u) => isCautionUser(u, cautionList),
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

  /** カスタム列のキー一覧（全ユーザーの raw_extra から出現順でユニーク化） */
  const customColumnKeys = useMemo(() => {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const user of userData) {
      const extras = (user.raw_extra ?? []) as { key?: string; value?: string }[];
      for (const e of extras) {
        const k = e?.key != null ? String(e.key).trim() : '';
        if (k && !seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }
    return keys;
  }, [userData]);

  const visibleFixedColumnsCount = Object.values(columnVisibility).filter(Boolean).length + 1; // +1 は操作列
  const totalColumns = visibleFixedColumnsCount + (showOtherData ? customColumnKeys.length : 0);
  const emptyRow = useMemo(
    () => (
      <tr>
        <td colSpan={totalColumns} className="db-table__cell db-table__cell--empty">
          データがありません。左メニューの「データ読取」からCSVファイルを取り込んでください。
        </td>
      </tr>
    ),
    [totalColumns],
  );

  const isCautionRow = useCallback(
    (user: UserBean) =>
      isCautionUser(user, cautionList),
    [cautionList],
  );

  const columns: DiscordTableColumn<(typeof userData)[number]>[] = useMemo(() => {
    const base: DiscordTableColumn<(typeof userData)[number]>[] = [];
    
    if (columnVisibility.name) {
      base.push({
        header: 'アカウント名',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.name}</td>,
      });
    }
    
    if (columnVisibility.vrcUrl) {
      base.push({
        header: (
          <>
            VRCアカウントURL
            <span className="db-table__th-hint">（クリックでVRCプロフィールに遷移）</span>
          </>
        ),
        headerClassName: 'db-table__th',
        renderCell: (user) => {
          const vrcUrl = user.vrc_url?.trim();
          const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!vrcUrl) return;
            handleConfirmOpen(vrcUrl);
          };
          const cls = [
            'db-table__cell',
            isCautionRow(user) ? 'db-table__cell--caution' : '',
            vrcUrl ? 'db-table__cell--link' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <td className={cls} onClick={handleClick}>
              {vrcUrl ? 'VRCプロフィール' : '—'}
            </td>
          );
        },
      });
    }
    
    if (columnVisibility.xId) {
      base.push({
        header: (
          <>
            アカウントID(X)
            <span className="db-table__th-hint">（クリックでユーザーページに遷移）</span>
          </>
        ),
        headerClassName: 'db-table__th',
        renderCell: (user) => (
          <XLinkCell xId={user.x_id} isCaution={isCautionRow(user)} onConfirmOpen={handleConfirmOpen} />
        ),
      });
    }
    
    if (columnVisibility.cast1) {
      base.push({
        header: '希望キャスト1',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.casts[0] || '—'}</td>,
      });
    }
    
    if (columnVisibility.cast2) {
      base.push({
        header: '希望キャスト2',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.casts[1] || '—'}</td>,
      });
    }
    
    if (columnVisibility.cast3) {
      base.push({
        header: '希望キャスト3',
        headerClassName: 'db-table__th',
        renderCell: (user) => <td className={`db-table__cell${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>{user.casts[2] || '—'}</td>,
      });
    }
    const extra = showOtherData ? customColumnKeys.map((key) => {
      const k = key;
      return {
        header: k,
        headerClassName: 'db-table__th db-table__th--custom',
        renderCell: (user: UserBean) => {
          const extras = (user.raw_extra ?? []) as { key?: string; value?: string }[];
          const entry = extras.find((e) => (e?.key ?? '').trim() === k);
          const val = entry?.value ?? '—';
          return (
            <td className={`db-table__cell db-table__cell--note${isCautionRow(user) ? ' db-table__cell--caution' : ''}`}>
              {val}
            </td>
          );
        },
      };
    }) : [];
    const operationCol: DiscordTableColumn<(typeof userData)[number]> = {
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
    };
    return [...base, ...extra, operationCol];
  }, [isCautionRow, handleConfirmOpen, customColumnKeys, showOtherData, columnVisibility]);

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
          要注意人物が含まれています。該当行は赤でマークされ、右端の❌からリストから削除できます。
        </div>
      )}

      {customColumnKeys.length > 0 && (
        <button
          type="button"
          onClick={() => setShowOtherData((prev) => !prev)}
          className="btn-secondary btn-full-width"
          style={{ marginTop: 20, marginBottom: 20 }}
        >
          {showOtherData ? '他データ列を隠す' : '他データ列を見る'}
        </button>
      )}

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <label className="form-label" style={{ marginBottom: 8 }}>表示する列を選択</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={columnVisibility.name}
              onChange={(e) => setColumnVisibility((prev) => ({ ...prev, name: e.target.checked }))}
            />
            <span style={{ fontSize: 14 }}>アカウント名</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={columnVisibility.vrcUrl}
              onChange={(e) => setColumnVisibility((prev) => ({ ...prev, vrcUrl: e.target.checked }))}
            />
            <span style={{ fontSize: 14 }}>VRCアカウントURL</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={columnVisibility.xId}
              onChange={(e) => setColumnVisibility((prev) => ({ ...prev, xId: e.target.checked }))}
            />
            <span style={{ fontSize: 14 }}>アカウントID(X)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={columnVisibility.cast1}
              onChange={(e) => setColumnVisibility((prev) => ({ ...prev, cast1: e.target.checked }))}
            />
            <span style={{ fontSize: 14 }}>希望キャスト1</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={columnVisibility.cast2}
              onChange={(e) => setColumnVisibility((prev) => ({ ...prev, cast2: e.target.checked }))}
            />
            <span style={{ fontSize: 14 }}>希望キャスト2</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={columnVisibility.cast3}
              onChange={(e) => setColumnVisibility((prev) => ({ ...prev, cast3: e.target.checked }))}
            />
            <span style={{ fontSize: 14 }}>希望キャスト3</span>
          </label>
        </div>
      </div>

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