// app/pages/MatchingPage.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Repository, type UserBean, type MatchingMode, type BusinessMode } from '../stores/AppContext';
import { MatchingService, MatchedCast } from '../features/matching/logics/matching_service';
import { DiscordTable, DiscordTableColumn } from '../components/DiscordTable';

interface MatchingPageProps {
  winners: UserBean[];
  allUserData: UserBean[]; // 互換性のために残しているが内部では repository を優先使用
  repository: Repository;
  matchingMode: MatchingMode;
  businessMode: BusinessMode;
}

const MatchingPageComponent: React.FC<MatchingPageProps> = ({
  winners,
  repository,
  matchingMode,
  businessMode,
}) => {
  const [matchingResult, setMatchingResult] = useState<Map<string, MatchedCast[]>>(new Map());


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

  return (
    <div className="fade-in page-wrapper">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-header-title page-header-title--lg">マッチング結果</h1>
        <p className="page-header-subtitle">
          {rotationCount}ローテーション制（
          {matchingMode === 'rotation' ? '循環ローテーション＋重み付きランダム' : '希望優先ランダムマッチング'}
          ）
        </p>
      </header>

      <DiscordTable<UserBean>
        columns={columns}
        rows={winners}
        containerStyle={{
          backgroundColor: 'var(--discord-bg-dark)',
          borderRadius: '8px',
          border: '1px solid var(--discord-border)',
          overflow: 'hidden',
        }}
        tableStyle={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
        headerRowStyle={{
          backgroundColor: 'var(--discord-bg-secondary)',
        }}
        emptyRow={emptyRow}
      />
    </div>
  );
};

export const MatchingPage = React.memo(MatchingPageComponent);