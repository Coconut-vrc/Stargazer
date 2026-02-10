// app/pages/MatchingPage.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const sheetService = useMemo(() => new SheetService(), []);

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
      return (
        <span
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--discord-bg-secondary)',
            color: 'var(--discord-text-muted)',
          }}
        >
          希望外
        </span>
      );
    }

    // 1:金、2:銀、3:銅っぽい配色
    const rankConfigs: Record<number, { bg: string; text: string }> = {
      1: { bg: '#F5C400', text: '#000' },
      2: { bg: '#A8A8A8', text: '#000' },
      3: { bg: '#AD6F2D', text: '#fff' },
    };

    const config = rankConfigs[rank] || { bg: 'var(--discord-accent-blue)', text: '#fff' };

    return (
      <span
        style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: 'bold',
          backgroundColor: config.bg,
          color: config.text,
        }}
      >
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
          <td
            style={{
              padding: '12px',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--discord-text-normal)' }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--discord-text-link)' }}>@{user.x_id}</div>
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
            <td
              style={{
                padding: '12px',
              }}
            >
              {slot ? (
                <div className="stack-vertical-4">
                  <div style={{ fontSize: '14px', color: 'var(--discord-text-normal)' }}>{slot.cast.name}</div>
                  <div>{renderRankBadge(slot.rank)}</div>
                </div>
              ) : (
                <span style={{ color: 'var(--discord-accent-red)', fontSize: '14px' }}>未配置</span>
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
          <td
            style={{
              padding: '12px',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--discord-text-normal)' }}>{row.castName}</div>
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
            <td
              style={{
                padding: '12px',
              }}
            >
              {assignment ? (
                <div className="stack-vertical-4">
                  <div style={{ fontSize: '14px', color: 'var(--discord-text-normal)' }}>
                    {assignment.userName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--discord-text-link)' }}>
                    @{assignment.x_id}
                  </div>
                  <div>{renderRankBadge(assignment.rank)}</div>
                </div>
              ) : (
                <span style={{ color: 'var(--discord-accent-red)', fontSize: '14px' }}>未配置</span>
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
        <td
          colSpan={3}
          style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--discord-text-muted)',
          }}
        >
          当選者がいません。抽選ページから抽選を行ってください。
        </td>
      </tr>
    ),
    [],
  );

  const castEmptyRow = useMemo(
    () => (
      <tr>
        <td
          colSpan={rotationCount + 1}
          style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--discord-text-muted)',
          }}
        >
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

      const sheetName = `マッチング結果_${yyyy}${mm}${dd}_${hh}${mi}${ss}`;

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

  return (
    <div className="fade-in page-wrapper">
      <header className="page-header" style={{ marginBottom: '16px' }}>
        <h1 className="page-header-title page-header-title--lg">マッチング結果</h1>
        <p className="page-header-subtitle">
          {rotationCount}ローテーション制（
          {matchingMode === 'rotation' ? '循環ローテーション＋重み付きランダム' : '希望優先ランダムマッチング'}
          ）
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || winners.length === 0}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'var(--discord-accent-green)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isExporting || winners.length === 0 ? 'not-allowed' : 'pointer',
            opacity: isExporting || winners.length === 0 ? 0.7 : 1,
          }}
        >
          {isExporting ? 'エクスポート中...' : 'マッチング結果をシートに保存'}
        </button>
      </div>

      <div className="table-container" style={{ marginBottom: '32px' }}>
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

      <section>
        <h2
          className="page-header-title page-header-title--md"
          style={{ marginBottom: '4px', fontSize: '18px' }}
        >
          キャスト別マッチング
        </h2>
        <p
          className="page-header-subtitle"
          style={{ marginBottom: '12px', fontSize: '13px' }}
        >
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