import React, { useCallback, useState } from 'react';
import { useAppContext } from '../stores/AppContext';

export const LotteryPage: React.FC = () => {
  const { setActivePage, repository, setCurrentWinners, matchingMode, setMatchingMode } = useAppContext();
  const [count, setCount] = useState(15);

  const run = useCallback(() => {
    const all = repository.getAllApplyUsers();
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    setCurrentWinners(shuffled.slice(0, count));
    setActivePage('lottery');
  }, [count, repository, setActivePage, setCurrentWinners]);

  return (
    <div style={{ padding: '24px 16px' }}>
      <div
        style={{
          backgroundColor: 'var(--discord-bg-dark)',
          borderRadius: '8px',
          padding: '24px 32px',
          maxWidth: '600px',
          margin: '24px auto',
          border: '1px solid var(--discord-border)',
          textAlign: 'left',
        }}
      >
          <h1
            style={{
              color: 'var(--discord-text-header)',
              fontSize: '18px',
              marginBottom: '4px',
              fontWeight: 700,
            }}
          >
            抽選条件
          </h1>
          <p
            style={{
              color: 'var(--discord-text-muted)',
              fontSize: '12px',
              marginBottom: '20px',
            }}
          >
            当選人数とマッチング方式を選択してください
          </p>

          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                color: 'var(--discord-text-muted)',
                display: 'block',
                marginBottom: '6px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              当選人数
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <input
                type="number"
                value={count}
                min={1}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{
                  width: '90px',
                  backgroundColor: 'var(--discord-bg-sidebar)',
                  border: '1px solid var(--discord-border)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  color: 'var(--discord-text-normal)',
                  fontSize: '18px',
                  textAlign: 'center',
                  outline: 'none',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--discord-text-muted)',
                }}
              >
                ※ 抽選で選ぶ最大人数
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '26px' }}>
            <label
              style={{
                color: 'var(--discord-text-muted)',
                display: 'block',
                marginBottom: '8px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              マッチング方式
            </label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => setMatchingMode('random')}
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor:
                    matchingMode === 'random'
                      ? 'var(--discord-accent-blue)'
                      : 'var(--discord-bg-sidebar)',
                  border: matchingMode === 'random'
                    ? '1px solid var(--discord-accent-blue)'
                    : '1px solid var(--discord-border)',
                  color: matchingMode === 'random' ? '#fff' : 'var(--discord-text-normal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: matchingMode === 'random' ? 600 : 500,
                  transition:
                    'background-color 0.12s ease-out, color 0.12s ease-out, border-color 0.12s ease-out',
                }}
              >
                <span>ランダムマッチング（希望優先）</span>
                <span
                  style={{
                    fontSize: '10px',
                    opacity: matchingMode === 'random' ? 1 : 0.6,
                  }}
                >
                  {matchingMode === 'random' ? '選択中' : 'クリックして選択'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMatchingMode('rotation')}
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  backgroundColor:
                    matchingMode === 'rotation'
                      ? 'var(--discord-accent-blue)'
                      : 'var(--discord-bg-sidebar)',
                  border: matchingMode === 'rotation'
                    ? '1px solid var(--discord-accent-blue)'
                    : '1px solid var(--discord-border)',
                  color:
                    matchingMode === 'rotation' ? '#fff' : 'var(--discord-text-normal)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: matchingMode === 'rotation' ? 600 : 500,
                  transition:
                    'background-color 0.12s ease-out, color 0.12s ease-out, border-color 0.12s ease-out',
                }}
              >
                <span>循環方式マッチング（ローテーション）</span>
                <span
                  style={{
                    fontSize: '10px',
                    opacity: matchingMode === 'rotation' ? 1 : 0.6,
                  }}
                >
                  {matchingMode === 'rotation' ? '選択中' : 'クリックして選択'}
                </span>
              </button>
            </div>
          </div>

          <button
            onClick={run}
            style={{
              width: '100%',
              backgroundColor: 'var(--discord-accent-blue)',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            抽選を開始する
          </button>
      </div>
    </div>
  );
};
