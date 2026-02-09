// app/pages/MatchingPage.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { UserBean, Repository } from '../stores/AppContext';
import { MatchingService, MatchedCast } from '../features/matching/logics/matching_service';
import { DiscordColors } from '../common/types/discord-colors';

interface MatchingPageProps {
  winners: UserBean[];
  allUserData: UserBean[]; // 互換性のために残しているが内部では repository を優先使用
  repository: Repository;
}

export const MatchingPage: React.FC<MatchingPageProps> = ({ winners, repository }) => {
  const [matchingResult, setMatchingResult] = useState<Map<string, MatchedCast[]>>(new Map());

  // ページ表示時、または当選者が変わった時にマッチングを再計算
  useEffect(() => {
    if (winners.length > 0) {
      const result = MatchingService.runMatching(winners, repository.getAllCasts());
      setMatchingResult(result);
    }
  }, [winners, repository]);

  /**
   * 希望ランクに応じたラベルを表示
   */
  const renderRankBadge = (rank: number) => {
    if (rank === 0) {
      return (
        <span style={{ 
          fontSize: '10px', 
          padding: '2px 6px', 
          borderRadius: '4px', 
          backgroundColor: DiscordColors.bgSecondary, 
          color: DiscordColors.textMuted 
        }}>
          希望外
        </span>
      );
    }

    // 1:金、2:銀、3:銅っぽい配色
    const rankConfigs: Record<number, { bg: string, text: string }> = {
      1: { bg: '#F5C400', text: '#000' }, 
      2: { bg: '#A8A8A8', text: '#000' },
      3: { bg: '#AD6F2D', text: '#fff' },
    };

    const config = rankConfigs[rank] || { bg: DiscordColors.accentBlue, text: '#fff' };

    return (
      <span style={{ 
        fontSize: '10px', 
        padding: '2px 6px', 
        borderRadius: '4px', 
        fontWeight: 'bold',
        backgroundColor: config.bg, 
        color: config.text 
      }}>
        第{rank}希望
      </span>
    );
  };

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ color: DiscordColors.textHeader, fontSize: '24px', fontWeight: 700 }}>
          マッチング結果
        </h1>
        <p style={{ color: DiscordColors.textMuted, fontSize: '14px' }}>
          2ラウンド制（希望1〜3を優先して割り当て）
        </p>
      </header>

      <div style={{ 
        backgroundColor: DiscordColors.bgDark, 
        borderRadius: '8px', 
        border: `1px solid ${DiscordColors.border}`,
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: DiscordColors.bgSecondary }}>
              <th style={{ padding: '12px', textAlign: 'left', color: DiscordColors.textMuted, fontSize: '12px', textTransform: 'uppercase' }}>当選ユーザー</th>
              <th style={{ padding: '12px', textAlign: 'left', color: DiscordColors.textMuted, fontSize: '12px', textTransform: 'uppercase' }}>Round 1</th>
              <th style={{ padding: '12px', textAlign: 'left', color: DiscordColors.textMuted, fontSize: '12px', textTransform: 'uppercase' }}>Round 2</th>
            </tr>
          </thead>
          <tbody>
            {winners.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: DiscordColors.textMuted }}>
                  当選者がいません。抽選ページから抽選を行ってください。
                </td>
              </tr>
            ) : (
              winners.map((user) => {
                const matched = matchingResult.get(user.x_id) || [];
                return (
                  <tr key={user.x_id} style={{ borderTop: `1px solid ${DiscordColors.border}` }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: DiscordColors.textNormal }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: DiscordColors.textLink }}>@{user.x_id}</div>
                    </td>
                    {[0, 1].map((roundIdx) => (
                      <td key={roundIdx} style={{ padding: '12px' }}>
                        {matched[roundIdx] ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '14px', color: DiscordColors.textNormal }}>
                              {matched[roundIdx].cast.name}
                            </div>
                            <div>
                              {renderRankBadge(matched[roundIdx].rank)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: DiscordColors.accentRed, fontSize: '14px' }}>未配置</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};