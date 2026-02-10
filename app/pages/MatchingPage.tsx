// app/pages/MatchingPage.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Repository, type UserBean, type MatchingMode, type BusinessMode } from '../stores/AppContext';
import { MatchingService, MatchedCast } from '../features/matching/logics/matching_service';
import { DiscordTable, DiscordTableColumn } from '../components/DiscordTable';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import { ConfirmModal } from '../components/ConfirmModal';

interface MatchingPageProps {
  winners: UserBean[];
  allUserData: UserBean[]; // 互換性のために残しているが内部では repository を優先使用
  repository: Repository;
  matchingMode: MatchingMode;
  businessMode: BusinessMode;
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

const MatchingPageComponent: React.FC<MatchingPageProps> = ({
  winners,
  repository,
  matchingMode,
  businessMode,
}) => {
  const [matchingResult, setMatchingResult] = useState<Map<string, MatchedCast[]>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPngUser, setIsExportingPngUser] = useState(false);
  const [isExportingPngCast, setIsExportingPngCast] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const sheetService = useMemo(() => new SheetService(), []);
  const userTableRef = useRef<HTMLDivElement>(null);
  const castTableRef = useRef<HTMLDivElement>(null);

  // ページ表示時、または当選者が変わった時にマッチングを再計算
  useEffect(() => {
    if (winners.length > 0) {
      const rotationCount = businessMode === 'normal' ? 3 : 2;
      const result = MatchingService.runMatching(
        winners,
        repository.getAllCasts(),
        matchingMode,
        rotationCount,
      );
      setMatchingResult(result);
    }
  }, [winners, repository, matchingMode, businessMode]);

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

  const rotationCount = businessMode === 'normal' ? 3 : 2;

  const columns: DiscordTableColumn<UserBean>[] = useMemo(
    () => [
      {
        header: '当選ユーザー',
        headerStyle: {
          padding: '12px',
          textAlign: 'left',
          color: 'var(--discord-text-muted)',
          fontSize: '12px',
          textTransform: 'uppercase',
        },
        renderCell: (user) => (
          <td className="table-cell-padding">
            <div className="text-user-name">{user.name}</div>
            <div className="text-x-id">@{user.x_id}</div>
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
        renderCell: (user) => {
          const matched = matchingResult.get(user.x_id) || [];
          const slot = matched[roundIdx];
          return (
            <td className="table-cell-padding">
              {slot ? (
                <div className="stack-vertical-4">
                  <div className="text-body-sm">{slot.cast.name}</div>
                  <div>{renderRankBadge(slot.rank)}</div>
                </div>
              ) : (
                <span className="text-unassigned">未配置</span>
              )}
            </td>
          );
        },
      })) as DiscordTableColumn<UserBean>[],
    ],
    [matchingResult, renderRankBadge, rotationCount],
  );

  // キャスト側から見た「各ローテで対応するユーザー」一覧を作る
  const castViewRows: CastViewRow[] = useMemo(() => {
    const allCasts = repository.getAllCasts().filter((c) => c.is_present);
    const basePerRound = Array.from({ length: rotationCount }, () => null as CastAssignment | null);

    const map = new Map<string, CastViewRow>();

    // まず出席キャストをベースとして作成
    for (const cast of allCasts) {
      map.set(cast.name, {
        castName: cast.name,
        perRound: [...basePerRound],
      });
    }

    // ユーザー側のマッチング結果から逆引き
    for (const user of winners) {
      const history = matchingResult.get(user.x_id) ?? [];
      history.forEach((slot, idx) => {
        if (!slot || idx >= rotationCount) return;
        const key = slot.cast.name;
        const row =
          map.get(key) ??
          {
            castName: key,
            perRound: [...basePerRound],
          };
        row.perRound[idx] = {
          userName: user.name,
          x_id: user.x_id,
          rank: slot.rank,
        };
        map.set(key, row);
      });
    }

    return Array.from(map.values()).sort((a, b) => a.castName.localeCompare(b.castName, 'ja'));
  }, [repository, winners, matchingResult, rotationCount]);

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
                  <div className="text-x-id">@{assignment.x_id}</div>
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
        <td colSpan={3} className="table-empty-cell">
          当選者がいません。抽選ページから抽選を行ってください。
        </td>
      </tr>
    ),
    [],
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

  const handleExport = useCallback(async () => {
    if (winners.length === 0) {
      setAlertMessage('当選者がいないため、マッチング結果をエクスポートできません。');
      return;
    }
    if (matchingResult.size === 0) {
      setAlertMessage('マッチング結果がまだ計算されていません。');
      return;
    }

    const userSheetUrl = repository.getUserSheetUrl();
    if (!userSheetUrl) {
      setAlertMessage('応募者名簿のURLが設定されていません。先に「外部連携設定」で同期してください。');
      return;
    }

    setIsExporting(true);
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      // シート名の生成（Google Sheetsのシート名制限に準拠）
      const baseName = `マッチング結果_${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
      // シート名は最大100文字、制御文字を排除
      const sheetName = baseName.slice(0, 100).replace(/[\x00-\x1F\x7F\[\]\\\/\?*:]/g, '');

      const values: (string | number)[][] = [];

      // ユーザー別マッチング結果
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
          if (slot) {
            if (slot.rank >= 1 && slot.rank <= 3) {
              row.push(`第${slot.rank}希望`);
            } else {
              row.push('希望外');
            }
          } else {
            row.push('');
          }
        }
        values.push(row);
      }

      values.push([]);

      // キャスト別接客リスト
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
            if (assignment.rank >= 1 && assignment.rank <= 3) {
              line.push(`第${assignment.rank}希望`);
            } else {
              line.push('希望外');
            }
          } else {
            line.push('');
            line.push('');
            line.push('');
          }
        }
        values.push(line);
      }

      await sheetService.createSheetAndWriteData(userSheetUrl, sheetName, values);
      setAlertMessage(`スプレッドシートに「${sheetName}」として保存しました。`);
    } catch (e) {
      console.error('マッチング結果エクスポート失敗:', e);
      setAlertMessage('マッチング結果のエクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  }, [winners, matchingResult, repository, rotationCount, castViewRows, sheetService]);

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
      await downloadPng(userTableRef.current, `マッチング結果_当選者別_${ts}.png`);
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
      await downloadPng(castTableRef.current, `マッチング結果_キャスト別_${ts}.png`);
      setAlertMessage('キャスト別のPNGをダウンロードしました。');
    } catch (e) {
      console.error('PNG出力失敗:', e);
      setAlertMessage('PNGの出力に失敗しました。');
    } finally {
      setIsExportingPngCast(false);
    }
  }, [winners.length, matchingResult.size, downloadPng]);

  return (
    <div className="fade-in page-wrapper">
      <header className="page-header page-header-tight">
        <h1 className="page-header-title page-header-title--lg">マッチング結果</h1>
        <p className="page-header-subtitle">
          {rotationCount}ローテーション制（
          {matchingMode === 'rotation' ? '循環ローテーション＋重み付きランダム' : '希望優先ランダムマッチング'}
          ）
        </p>
      </header>

      <div className="action-bar">
        <button
          type="button"
          className="btn-export-secondary"
          onClick={handleExportPngUser}
          disabled={isExportingPngUser || winners.length === 0}
        >
          {isExportingPngUser ? '出力中...' : 'PNGで保存（当選者別）'}
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
          onClick={handleExport}
          disabled={isExporting || winners.length === 0}
        >
          {isExporting ? 'エクスポート中...' : 'マッチング結果をシートに保存'}
        </button>
      </div>

      <div ref={userTableRef} className="section-block-with-mb">
        <div className="table-container">
          <DiscordTable<UserBean>
            columns={columns}
            rows={winners}
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
          type="alert"
        />
      )}
    </div>
  );
};

export const MatchingPage = React.memo(MatchingPageComponent);