// desktop/src/features/matching/MatchingPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Repository, type UserBean, type MatchingTypeCode } from '@/stores/AppContext';
import type { MatchingSettingsState } from '@/features/matching/stores/matching-settings-store';
import { MatchingService, MatchedCast, type TableSlot } from '@/features/matching/logics/matching_service';
import { DiscordTable, DiscordTableColumn } from '@/components/DiscordTable';
import { ConfirmModal } from '@/components/ConfirmModal';
import { XLinkInline } from '@/components/XLinkCell';
import { downloadCsv } from '@/common/downloadCsv';
import { MATCHING_SHEET_PREFIX } from '@/common/sheetColumns';
import { MATCHING_TYPE_LABELS } from '@/features/matching/types/matching-type-codes';

interface MatchingPageProps {
  winners: UserBean[];
  repository: Repository;
  matchingTypeCode: MatchingTypeCode;
  rotationCount: number;
  totalTables: number;
  groupCount: number;
  usersPerGroup: number;
  usersPerTable: number;
  castsPerRotation: number;
  matchingSettings: MatchingSettingsState;
}

interface CastAssignment {
  userName: string;
  x_id: string;
  rank: number;
}

interface CastViewRow {
  castName: string;
  perRound: (CastAssignment | null)[];
}

/** 当選者別／テーブル別の共通行（表示用） */
interface MatchingRow {
  tableIndex?: number;
  user: UserBean | null;
  matches: MatchedCast[];
}

const MatchingPageComponent: React.FC<MatchingPageProps> = ({
  winners,
  repository,
  matchingTypeCode,
  rotationCount,
  totalTables,
  groupCount,
  usersPerGroup,
  usersPerTable,
  castsPerRotation,
  matchingSettings,
}) => {
  const [matchingResult, setMatchingResult] = useState<Map<string, MatchedCast[]>>(new Map());
  const [tableSlots, setTableSlots] = useState<TableSlot[] | undefined>(undefined);
  const [isExportingPngUser, setIsExportingPngUser] = useState(false);
  const [isExportingPngCast, setIsExportingPngCast] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const userTableRef = useRef<HTMLDivElement>(null);
  const castTableRef = useRef<HTMLDivElement>(null);

  const runOptions = useMemo(() => ({
    rotationCount,
    totalTables: (matchingTypeCode === 'M003' || matchingTypeCode === 'M004') && totalTables > 0 ? totalTables : undefined,
    groupCount: matchingTypeCode === 'M005' ? groupCount : undefined,
    usersPerGroup: matchingTypeCode === 'M005' ? usersPerGroup : undefined,
    usersPerTable: matchingTypeCode === 'M006' ? usersPerTable : undefined,
    castsPerRotation: matchingTypeCode === 'M006' ? castsPerRotation : undefined,
  }), [matchingTypeCode, rotationCount, totalTables, groupCount, usersPerGroup, usersPerTable, castsPerRotation]);

  // ページ表示時、または当選者が変わった時にマッチングを再計算
  useEffect(() => {
    if (winners.length > 0) {
      const { userMap, tableSlots: slots } = MatchingService.runMatching(
        winners,
        repository.getAllCasts(),
        matchingTypeCode,
        runOptions,
        matchingSettings.ngJudgmentType,
        matchingSettings.ngMatchingBehavior,
      );
      setMatchingResult(userMap);
      setTableSlots(slots);
    } else {
      setMatchingResult(new Map());
      setTableSlots(undefined);
    }
  }, [winners, repository, matchingTypeCode, runOptions, matchingSettings]);

  /**
   * 希望ランクに応じたラベルを表示
   */
  const renderRankBadge = useCallback((rank: number) => {
    if (rank === 0) {
      return <span className="rank-badge rank-badge--out">希望外</span>;
    }
    const modifier = rank >= 1 && rank <= 3 ? `rank-badge--${rank}` : 'rank-badge--other';
    return (
      <span className={`rank-badge ${modifier}`}>
        第{rank}希望
      </span>
    );
  }, []);


  // テーブル別（空含む）のときは tableSlots から、そうでないときは当選者＋matchingResult から行を構築
  const matchingRows: MatchingRow[] = useMemo(() => {
    if (tableSlots != null && tableSlots.length > 0) {
      return tableSlots.map((slot, i) => ({
        tableIndex: i + 1,
        user: slot.user,
        matches: slot.matches,
      }));
    }
    return winners.map((u) => ({
      user: u,
      matches: matchingResult.get(u.x_id) ?? [],
    }));
  }, [tableSlots, winners, matchingResult]);

  const columns: DiscordTableColumn<MatchingRow>[] = useMemo(
    () => [
      {
        header: tableSlots != null && tableSlots.length > 0 ? 'テーブル番号 / 当選者' : '当選ユーザー',
        headerStyle: {
          padding: '12px',
          textAlign: 'left',
          color: 'var(--discord-text-muted)',
          fontSize: '12px',
          textTransform: 'uppercase',
        },
        renderCell: (row) => (
          <td className="table-cell-padding">
            {row.tableIndex != null && (
              <div className="text-body-sm table-cell-table-index">
                テーブル {row.tableIndex}
              </div>
            )}
            {row.user ? (
              <>
                <div className="text-user-name">{row.user.name}</div>
                <XLinkInline xId={row.user.x_id} />
              </>
            ) : (
              <span className="text-unassigned">空</span>
            )}
          </td>
        ),
      },
      ...Array.from({ length: rotationCount }, (_, roundIdx) => ({
        header: `${roundIdx + 1}ローテ目`,
        headerStyle: {
          padding: '12px',
          textAlign: 'left',
          color: 'var(--discord-text-muted)',
          fontSize: '12px',
          textTransform: 'uppercase',
        },
        renderCell: (row) => {
          const slot = row.matches[roundIdx];
          const isNG = slot?.isNGWarning === true;
          return (
            <td
              className={`table-cell-padding ${isNG ? 'matching-cell-ng-warning' : ''}`}
              title={isNG ? slot?.ngReason : undefined}
            >
              {slot ? (
                <div className="stack-vertical-4">
                  {isNG && (
                    <span className="matching-ng-icon" aria-label="NG警告" title={slot.ngReason}>
                      ⚠
                    </span>
                  )}
                  <div className="text-body-sm">{slot.cast.name}</div>
                  <div>{renderRankBadge(slot.rank)}</div>
                </div>
              ) : (
                <span className="text-unassigned">未配置</span>
              )}
            </td>
          );
        },
      })) as DiscordTableColumn<MatchingRow>[],
    ],
    [tableSlots, renderRankBadge, rotationCount],
  );

  // キャスト側から見た「各ローテで対応するユーザー」一覧を作る（テーブル別時は tableSlots から逆引き）
  const castViewRows: CastViewRow[] = useMemo(() => {
    const allCasts = repository.getAllCasts().filter((c) => c.is_present);
    const basePerRound = Array.from({ length: rotationCount }, () => null as CastAssignment | null);
    const map = new Map<string, CastViewRow>();

    for (const cast of allCasts) {
      map.set(cast.name, { castName: cast.name, perRound: [...basePerRound] });
    }

    if (tableSlots != null && tableSlots.length > 0) {
      for (const slot of tableSlots) {
        for (let idx = 0; idx < rotationCount && idx < slot.matches.length; idx++) {
          const m = slot.matches[idx];
          if (!m) continue;
          const row = map.get(m.cast.name) ?? { castName: m.cast.name, perRound: [...basePerRound] };
          row.perRound[idx] = slot.user
            ? { userName: slot.user.name, x_id: slot.user.x_id, rank: m.rank }
            : null;
          map.set(m.cast.name, row);
        }
      }
    } else {
      for (const user of winners) {
        const history = matchingResult.get(user.x_id) ?? [];
        history.forEach((slot, idx) => {
          if (!slot || idx >= rotationCount) return;
          const row = map.get(slot.cast.name) ?? { castName: slot.cast.name, perRound: [...basePerRound] };
          row.perRound[idx] = { userName: user.name, x_id: user.x_id, rank: slot.rank };
          map.set(slot.cast.name, row);
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.castName.localeCompare(b.castName, 'ja'));
  }, [repository, winners, matchingResult, tableSlots, rotationCount]);

  const castColumns: DiscordTableColumn<CastViewRow>[] = useMemo(
    () => [
      {
        header: 'キャスト',
        headerStyle: {
          padding: '12px',
          textAlign: 'left',
          color: 'var(--discord-text-muted)',
          fontSize: '12px',
          textTransform: 'uppercase',
        },
        renderCell: (row) => (
          <td className="table-cell-padding">
            <div className="text-user-name">{row.castName}</div>
          </td>
        ),
      },
      ...Array.from({ length: rotationCount }, (_, roundIdx) => ({
        header: `${roundIdx + 1}ローテ目`,
        headerStyle: {
          padding: '12px',
          textAlign: 'left',
          color: 'var(--discord-text-muted)',
          fontSize: '12px',
          textTransform: 'uppercase',
        },
        renderCell: (row: CastViewRow) => {
          const assignment = row.perRound[roundIdx];
          return (
            <td className="table-cell-padding">
              {assignment ? (
                <div className="stack-vertical-4">
                  <div className="text-body-sm">{assignment.userName}</div>
                  <XLinkInline xId={assignment.x_id} />
                  <div>{renderRankBadge(assignment.rank)}</div>
                </div>
              ) : (
                <span className="text-unassigned">未配置</span>
              )}
            </td>
          );
        },
      })) as DiscordTableColumn<CastViewRow>[],
    ],
    [renderRankBadge, rotationCount],
  );

  const emptyRow = useMemo(
    () => (
      <tr>
        <td colSpan={rotationCount + 1} className="table-empty-cell">
          当選者がいません。抽選ページから抽選を行ってください。
        </td>
      </tr>
    ),
    [rotationCount],
  );

  const castEmptyRow = useMemo(
    () => (
      <tr>
        <td colSpan={rotationCount + 1} className="table-empty-cell">
          キャストがいません。キャスト管理ページから出席キャストを設定してください。
        </td>
      </tr>
    ),
    [rotationCount],
  );

  const handleExportCsv = useCallback(() => {
    if (winners.length === 0) {
      setAlertMessage('当選者がいないため、マッチング結果をエクスポートできません。');
      return;
    }
    if (matchingResult.size === 0) {
      setAlertMessage('マッチング結果がまだ計算されていません。');
      return;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const filename = `マッチング結果_${yyyy}${mm}${dd}_${hh}${mi}${ss}.csv`;

    const values: (string | number)[][] = [];

    if (tableSlots != null && tableSlots.length > 0) {
      values.push(['テーブル別マッチング結果']);
      const tableHeader: string[] = ['テーブル番号', 'name', 'x_id'];
      for (let r = 0; r < rotationCount; r++) {
        tableHeader.push(`${r + 1}ローテ目_キャスト`);
        tableHeader.push(`${r + 1}ローテ目_ランク`);
      }
      values.push(tableHeader);
      for (let i = 0; i < tableSlots.length; i++) {
        const slot = tableSlots[i];
        const row: (string | number)[] = [i + 1, slot.user?.name ?? '空', slot.user?.x_id ?? ''];
        for (let r = 0; r < rotationCount; r++) {
          const m = slot.matches[r];
          row.push(m?.cast.name ?? '');
          row.push(m && m.rank >= 1 && m.rank <= 3 ? `第${m.rank}希望` : m ? '希望外' : '');
        }
        values.push(row);
      }
    } else {
      values.push(['ユーザー別マッチング結果']);
      const userHeader: string[] = ['name', 'x_id'];
      for (let r = 0; r < rotationCount; r++) {
        userHeader.push(`${r + 1}ローテ目_キャスト`);
        userHeader.push(`${r + 1}ローテ目_ランク`);
      }
      values.push(userHeader);
      for (const user of winners) {
        const history = matchingResult.get(user.x_id) ?? [];
        const row: (string | number)[] = [user.name, user.x_id];
        for (let r = 0; r < rotationCount; r++) {
          const slot = history[r];
          row.push(slot?.cast.name ?? '');
          row.push(slot ? (slot.rank >= 1 && slot.rank <= 3 ? `第${slot.rank}希望` : '希望外') : '');
        }
        values.push(row);
      }
    }

    values.push([]);
    values.push(['キャスト別接客リスト']);
    const castHeader: string[] = ['cast_name'];
    for (let r = 0; r < rotationCount; r++) {
      castHeader.push(`${r + 1}ローテ目_ユーザー`);
      castHeader.push(`${r + 1}ローテ目_XID`);
      castHeader.push(`${r + 1}ローテ目_ランク`);
    }
    values.push(castHeader);

    for (const row of castViewRows) {
      const line: (string | number)[] = [row.castName];
      for (let r = 0; r < rotationCount; r++) {
        const assignment = row.perRound[r];
        if (assignment) {
          line.push(assignment.userName);
          line.push(assignment.x_id);
          line.push(assignment.rank >= 1 && assignment.rank <= 3 ? `第${assignment.rank}希望` : '希望外');
        } else {
          line.push('', '', '');
        }
      }
      values.push(line);
    }

    downloadCsv(values, filename);
    setAlertMessage('CSV をダウンロードしました。');
  }, [winners, matchingResult, tableSlots, rotationCount, castViewRows]);

  const downloadPng = useCallback(
    (node: HTMLElement, filename: string) => {
      // 要素とその子要素のスタイルを一時的に保存・変更
      const originalStyles: Array<{ element: HTMLElement; styles: { [key: string]: string } }> = [];
      
      // 再帰的に要素と子要素の overflow を解除
      const collectAndModifyStyles = (el: HTMLElement) => {
        const computedStyle = window.getComputedStyle(el);
        const styles: { [key: string]: string } = {};
        
        // overflow 関連のスタイルを保存して解除
        if (computedStyle.overflow !== 'visible' || computedStyle.overflowX !== 'visible' || computedStyle.overflowY !== 'visible') {
          styles.overflow = el.style.overflow;
          styles.overflowX = el.style.overflowX;
          styles.overflowY = el.style.overflowY;
          styles.maxHeight = el.style.maxHeight;
          styles.maxWidth = el.style.maxWidth;
          
          el.style.overflow = 'visible';
          el.style.overflowX = 'visible';
          el.style.overflowY = 'visible';
          el.style.maxHeight = 'none';
          el.style.maxWidth = 'none';
          
          originalStyles.push({ element: el, styles });
        }
        
        // 子要素も再帰的に処理
        Array.from(el.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            collectAndModifyStyles(child);
          }
        });
      };
      
      collectAndModifyStyles(node);
      
      // スクロール位置をリセット
      const originalScrollTop = node.scrollTop;
      const originalScrollLeft = node.scrollLeft;
      node.scrollTop = 0;
      node.scrollLeft = 0;
      
      // 少し待ってからレンダリング（スタイル変更が反映されるまで）
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          // 要素の実際のサイズを取得
          const scrollWidth = node.scrollWidth;
          const scrollHeight = node.scrollHeight;
          
          toPng(node, {
            backgroundColor: '#313338',
            pixelRatio: 2,
            cacheBust: true,
            width: scrollWidth,
            height: scrollHeight,
          })
            .then((dataUrl) => {
              // スタイルを元に戻す
              originalStyles.forEach(({ element, styles }) => {
                Object.entries(styles).forEach(([key, value]) => {
                  if (value) {
                    (element.style as any)[key] = value;
                  } else {
                    (element.style as any)[key] = '';
                  }
                });
              });
              
              // スクロール位置を元に戻す
              node.scrollTop = originalScrollTop;
              node.scrollLeft = originalScrollLeft;
              
              const link = document.createElement('a');
              link.download = filename;
              link.href = dataUrl;
              link.click();
              resolve();
            })
            .catch((error) => {
              // エラー時もスタイルを元に戻す
              originalStyles.forEach(({ element, styles }) => {
                Object.entries(styles).forEach(([key, value]) => {
                  if (value) {
                    (element.style as any)[key] = value;
                  } else {
                    (element.style as any)[key] = '';
                  }
                });
              });
              
              node.scrollTop = originalScrollTop;
              node.scrollLeft = originalScrollLeft;
              reject(error);
            });
        }, 100);
      });
    },
    [],
  );

  const handleExportPngUser = useCallback(async () => {
    if (!userTableRef.current || winners.length === 0 || matchingResult.size === 0) {
      if (winners.length === 0 || matchingResult.size === 0) setAlertMessage('当選者またはマッチング結果がありません。');
      return;
    }
    setIsExportingPngUser(true);
    try {
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      await downloadPng(userTableRef.current, `${MATCHING_SHEET_PREFIX}当選者別_${ts}.png`);
      setAlertMessage('当選者別のPNGをダウンロードしました。');
    } catch (e) {
      console.error('PNG出力失敗:', e);
      setAlertMessage('PNGの出力に失敗しました。');
    } finally {
      setIsExportingPngUser(false);
    }
  }, [winners.length, matchingResult.size, downloadPng]);

  const handleExportPngCast = useCallback(async () => {
    if (!castTableRef.current || winners.length === 0 || matchingResult.size === 0) {
      if (winners.length === 0 || matchingResult.size === 0) setAlertMessage('当選者またはマッチング結果がありません。');
      return;
    }
    setIsExportingPngCast(true);
    try {
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      await downloadPng(castTableRef.current, `${MATCHING_SHEET_PREFIX}キャスト別_${ts}.png`);
      setAlertMessage('キャスト別のPNGをダウンロードしました。');
    } catch (e) {
      console.error('PNG出力失敗:', e);
      setAlertMessage('PNGの出力に失敗しました。');
    } finally {
      setIsExportingPngCast(false);
    }
  }, [winners.length, matchingResult.size, downloadPng]);

  const casts = repository.getAllCasts();
  const hasCasts = casts.length > 0;

  return (
    <div className="fade-in page-wrapper">
      <header className="page-header page-header-tight">
        <h1 className="page-header-title page-header-title--lg">マッチング結果</h1>
        <p className="page-header-subtitle">
          {rotationCount}ローテーション制（{MATCHING_TYPE_LABELS[matchingTypeCode]}）
        </p>
      </header>

      {winners.length > 0 && !hasCasts && (
        <div className="section-block-with-mb banner-muted">
          キャストデータがありません。データ読取で同期してからマッチングを表示できます。
        </div>
      )}

      <div className="action-bar">
        <button
          type="button"
          className="btn-export-secondary"
          onClick={handleExportPngUser}
          disabled={isExportingPngUser || winners.length === 0}
        >
          {isExportingPngUser ? '出力中...' : tableSlots?.length ? 'PNGで保存（テーブル別）' : 'PNGで保存（当選者別）'}
        </button>
        <button
          type="button"
          className="btn-export-secondary"
          onClick={handleExportPngCast}
          disabled={isExportingPngCast || winners.length === 0}
        >
          {isExportingPngCast ? '出力中...' : 'PNGで保存（キャスト別）'}
        </button>
        <button
          type="button"
          className="btn-export-primary"
          onClick={handleExportCsv}
          disabled={winners.length === 0}
        >
          マッチング結果をCSVでダウンロード
        </button>
      </div>

      <div ref={userTableRef} className="section-block-with-mb">
        <div className="table-container">
          <DiscordTable<MatchingRow>
            columns={columns}
            rows={matchingRows}
            containerStyle={undefined}
            tableStyle={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '700px',
            }}
            headerRowStyle={{
              backgroundColor: 'var(--discord-bg-secondary)',
            }}
            emptyRow={emptyRow}
          />
        </div>
      </div>

      <section ref={castTableRef} className="section-block">
        <h2 className="page-header-title page-header-title--md section-title-inline">
          キャスト別マッチング
        </h2>
        <p className="page-header-subtitle section-subtitle-inline">
          各キャストが各ローテーションで接客するユーザーの一覧です。
        </p>

        <div className="table-container">
          <DiscordTable<CastViewRow>
            columns={castColumns}
            rows={castViewRows}
            containerStyle={undefined}
            tableStyle={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '600px',
            }}
            headerRowStyle={{
              backgroundColor: 'var(--discord-bg-secondary)',
            }}
            emptyRow={castEmptyRow}
          />
        </div>
      </section>

      {alertMessage && (
        <ConfirmModal
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
          confirmLabel="OK"
          type="alert"
        />
      )}
    </div>
  );
};

export const MatchingPage = React.memo(MatchingPageComponent);