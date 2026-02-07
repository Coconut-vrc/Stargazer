import React, { useState } from 'react';
import { UserBean, useAppContext } from '../stores/AppContext';
import { MatchingService } from '../features/matching/logics/matching_service';
import { DiscordColors } from '../common/types/discord-colors';

interface MatchingResult {
  pair_no: string;
  user_a: UserBean;
  user_b: UserBean;
  t1: string;
  t1_info: string;
  t2: string;
  t2_info: string;
  t3: string;
  t3_info: string;
}

export const MatchingPage: React.FC<{
  winners: UserBean[];
  allUserData: UserBean[];
  repository: ReturnType<typeof useAppContext>['repository'];
}> = ({ winners: currentWinners, repository }) => {
  const [results, setResults] = useState<MatchingResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const containerStyle: React.CSSProperties = {
    padding: '24px 16px',
    minHeight: '100%',
    color: DiscordColors.textNormal,
  };

  const tableWrapperStyle: React.CSSProperties = {
    backgroundColor: DiscordColors.bgDark,
    borderRadius: '8px',
    overflow: 'hidden',
    border: `1px solid ${DiscordColors.border}`,
    marginBottom: '24px',
  };

  const headerCellStyle: React.CSSProperties = {
    backgroundColor: DiscordColors.bgSidebar,
    color: DiscordColors.textMuted,
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${DiscordColors.border}`,
    textAlign: 'left',
  };

  const cellStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: `1px solid ${DiscordColors.border}`,
    fontSize: '14px',
  };

  const startMatching = () => {
    if (currentWinners.length === 0) {
      alert('当選者が選択されていません。');
      return;
    }
    const service = new MatchingService(currentWinners, repository);
    const matchingResults = service.runMatching();
    setResults(matchingResults as MatchingResult[]);
    setShowResults(true);
  };

  if (showResults) {
    return (
      <div style={containerStyle}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: DiscordColors.textHeader, margin: 0, fontSize: '20px' }}>マッチング完了</h1>
          <p style={{ color: DiscordColors.textMuted, margin: '4px 0', fontSize: '14px' }}>生成されたローテーション案です</p>
        </div>
        <div style={tableWrapperStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>ペア</th>
                <th style={headerCellStyle}>ユーザーA</th>
                <th style={headerCellStyle}>ユーザーB</th>
                <th style={headerCellStyle}>T1</th>
                <th style={headerCellStyle}>T2</th>
                <th style={headerCellStyle}>T3</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : DiscordColors.bgAlt }}>
                  <td style={{ ...cellStyle, color: DiscordColors.accentBlue, fontWeight: 600 }}>{r.pair_no}</td>
                  <td style={cellStyle}>{r.user_a.name}</td>
                  <td style={cellStyle}>{r.user_b.name}</td>
                  <td style={cellStyle}>
                    <div style={{ color: DiscordColors.accentYellow, fontWeight: 600 }}>{r.t1}</div>
                    <div style={{ color: DiscordColors.textMuted, fontSize: '12px' }}>{r.t1_info}</div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ color: DiscordColors.accentYellow, fontWeight: 600 }}>{r.t2}</div>
                    <div style={{ color: DiscordColors.textMuted, fontSize: '12px' }}>{r.t2_info}</div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{ color: DiscordColors.accentYellow, fontWeight: 600 }}>{r.t3}</div>
                    <div style={{ color: DiscordColors.textMuted, fontSize: '12px' }}>{r.t3_info}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '16px' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: DiscordColors.textLink,
                cursor: 'pointer',
                fontSize: '14px',
              }}
              onClick={() => setShowResults(false)}
            >
              ← 設定に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: DiscordColors.textHeader, margin: 0, fontSize: '20px' }}>マッチング構成確認</h1>
        <p style={{ color: DiscordColors.textMuted, margin: '4px 0', fontSize: '14px' }}>
          当選者リストに基づきペアを自動生成します
        </p>
      </div>
      <div style={tableWrapperStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>卓</th>
              <th style={headerCellStyle}>ユーザー名</th>
              <th style={headerCellStyle}>ID</th>
              <th style={headerCellStyle}>希望キャスト</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 15 }, (_, i) => {
              const winner = currentWinners[i];
              return (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : DiscordColors.bgAlt }}>
                  <td style={{ ...cellStyle, color: DiscordColors.accentBlue, fontWeight: 600 }}>卓 {i + 1}</td>
                  <td style={cellStyle}>{winner ? winner.name : '—'}</td>
                  <td style={{ ...cellStyle, color: DiscordColors.textMuted }}>{winner ? `@${winner.x_id}` : ''}</td>
                  <td style={cellStyle}>{winner ? winner.casts.join(', ') : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
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
          onClick={startMatching}
        >
          マッチング開始
        </button>
      </div>
    </div>
  );
};
