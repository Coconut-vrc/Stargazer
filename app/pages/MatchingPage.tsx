'use client';

import React, { useState } from 'react';
import { UserBean, useAppContext, Repository } from '../stores/AppContext';
import { MatchingService } from '../features/matching/logics/matching_service';
import { DiscordColors } from '../common/types/discord-colors';

// 2ラウンド制に合わせた表示用データ構造
interface MatchingResult {
  pair_no: string;
  user_a: UserBean;
  user_b: { name: string }; 
  t1: string;
  t1_info: string;
  t2: string;
  t2_info: string;
  // t3 は削除
}

interface MatchingPageProps {
  winners: UserBean[];
  allUserData: UserBean[];
  repository: Repository;
}

export const MatchingPage: React.FC<MatchingPageProps> = ({ 
  winners: currentWinners, 
  repository 
}) => {
  const [results, setResults] = useState<MatchingResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const containerStyle: React.CSSProperties = {
    padding: '20px 12px',
    minHeight: '100%',
    color: DiscordColors.textNormal,
    backgroundColor: DiscordColors.bgMain
  };

  const tableWrapperStyle: React.CSSProperties = {
    backgroundColor: DiscordColors.bgDark,
    borderRadius: '8px',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    border: `1px solid ${DiscordColors.border}`,
    marginBottom: '24px',
  };

  const headerCellStyle: React.CSSProperties = {
    backgroundColor: DiscordColors.bgSidebar,
    color: DiscordColors.textMuted,
    padding: '10px 12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${DiscordColors.border}`,
    textAlign: 'left',
  };

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${DiscordColors.border}`,
    fontSize: '12px',
  };

  const startMatching = () => {
    if (!currentWinners || currentWinners.length === 0) {
      alert('当選者が選択されていません。');
      return;
    }

    const allCasts = repository.getAllCasts();
    // 2ラウンド制のロジックを実行
    const matchMap = MatchingService.runMatching(currentWinners, allCasts);

    const displayResults: MatchingResult[] = currentWinners.map((winner, index) => {
      const assignedCasts = matchMap.get(winner.x_id) || [];
      
      return {
        pair_no: `卓 ${index + 1}`,
        user_a: winner,
        user_b: { name: '—' }, 
        t1: assignedCasts[0]?.name || 'なし',
        t1_info: assignedCasts[0] ? 'マッチング済' : '-',
        t2: assignedCasts[1]?.name || 'なし',
        t2_info: assignedCasts[1] ? 'マッチング済' : '-',
      };
    });

    setResults(displayResults);
    setShowResults(true);
  };

  if (showResults) {
    return (
      <div style={containerStyle}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: DiscordColors.textHeader, margin: 0, fontSize: '20px' }}>マッチング完了</h1>
        </div>
        <div style={tableWrapperStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>卓</th>
                <th style={headerCellStyle}>ユーザー</th>
                <th style={headerCellStyle}>ID</th>
                <th style={headerCellStyle}>ROUND 1</th>
                <th style={headerCellStyle}>ROUND 2</th>
                {/* ROUND 3 のヘッダーを削除 */}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : DiscordColors.bgAlt }}>
                  <td style={{ ...cellStyle, color: DiscordColors.accentBlue, fontWeight: 600 }}>{r.pair_no}</td>
                  <td style={cellStyle}>{r.user_a.name}</td>
                  <td style={{ ...cellStyle, color: DiscordColors.textMuted }}>@{r.user_a.x_id}</td>
                  <td style={cellStyle}>
                    <div style={{ color: DiscordColors.accentYellow, fontWeight: 600 }}>{r.t1}</div>
                    <div style={{ color: DiscordColors.textMuted, fontSize: '11px' }}>{r.t1_info}</div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ color: DiscordColors.accentYellow, fontWeight: 600 }}>{r.t2}</div>
                    <div style={{ color: DiscordColors.textMuted, fontSize: '11px' }}>{r.t2_info}</div>
                  </td>
                  {/* ROUND 3 のセルを削除 */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px' }}>
          <button
            onClick={() => setShowResults(false)}
            style={{ background: 'none', border: 'none', color: DiscordColors.textLink, cursor: 'pointer', fontSize: '14px' }}
          >
            ← 設定に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ color: DiscordColors.textHeader, marginBottom: '24px', fontSize: '20px' }}>マッチング構成確認</h1>
      <div style={tableWrapperStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>卓</th>
              <th style={headerCellStyle}>ユーザー名</th>
              <th style={headerCellStyle}>ID</th>
              <th style={headerCellStyle}>希望キャスト</th>
            </tr>
          </thead>
          <tbody>
            {currentWinners.map((winner, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : DiscordColors.bgAlt }}>
                <td style={{ ...cellStyle, color: DiscordColors.accentBlue, fontWeight: 600 }}>卓 {i + 1}</td>
                <td style={cellStyle}>{winner ? winner.name : '—'}</td>
                <td style={{ ...cellStyle, color: DiscordColors.textMuted }}>{winner ? `@${winner.x_id}` : ''}</td>
                <td style={cellStyle}>{winner && Array.isArray(winner.casts) ? winner.casts.join(', ') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={startMatching}
          style={{
            backgroundColor: DiscordColors.buttonSuccess,
            color: '#fff',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          マッチング開始
        </button>
      </div>
    </div>
  );
};