import React, { useState } from 'react';
import { useAppContext } from '../stores/AppContext';
import { DiscordColors } from '../common/types/discord-colors';

export const LotteryPage: React.FC = () => {
  const { setActivePage, repository, setCurrentWinners } = useAppContext();
  const [count, setCount] = useState(15);

  const run = () => {
    const all = repository.getAllApplyUsers();
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    setCurrentWinners(shuffled.slice(0, count));
    setActivePage('matching');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div
        style={{
          backgroundColor: DiscordColors.bgDark,
          padding: '32px 40px',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          border: `1px solid ${DiscordColors.border}`,
        }}
      >
        <h1 style={{ color: DiscordColors.textHeader, fontSize: '20px', marginBottom: '24px' }}>
          抽選の実行
        </h1>

        <div style={{ marginBottom: '28px' }}>
          <label style={{ color: DiscordColors.textMuted, display: 'block', marginBottom: '10px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            当選人数
          </label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{
              width: '80px',
              backgroundColor: DiscordColors.bgSidebar,
              border: `1px solid ${DiscordColors.border}`,
              padding: '12px',
              borderRadius: '4px',
              color: DiscordColors.textNormal,
              fontSize: '20px',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={run}
          style={{
            width: '100%',
            backgroundColor: DiscordColors.accentBlue,
            color: '#fff',
            border: 'none',
            padding: '14px',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          抽選を開始する
        </button>
      </div>
    </div>
  );
};
