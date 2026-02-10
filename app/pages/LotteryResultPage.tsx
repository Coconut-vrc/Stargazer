import React from 'react';
import { useAppContext } from '../stores/AppContext';

export const LotteryResultPage: React.FC = () => {
  const { currentWinners, setActivePage } = useAppContext();

  return (
    <div className="fade-in" style={{ padding: '24px' }}>
      <header style={{ marginBottom: '16px' }}>
        <h1
          style={{
            color: 'var(--discord-text-header)',
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '4px',
          }}
        >
          マッチング構成確認
        </h1>
        <p
          style={{
            color: 'var(--discord-text-muted)',
            fontSize: '14px',
          }}
        >
          当選者と希望キャストを再度確認してください
        </p>
      </header>

      <div
        style={{
          backgroundColor: 'var(--discord-bg-dark)',
          borderRadius: '8px',
          border: '1px solid var(--discord-border)',
          overflowX: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '800px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: 'var(--discord-bg-secondary)' }}>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--discord-text-muted)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  width: '60px',
                }}
              >
                #
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--discord-text-muted)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                ユーザー
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--discord-text-muted)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                X ID
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--discord-text-muted)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                希望1
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--discord-text-muted)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                希望2
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--discord-text-muted)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                希望3
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  color: 'var(--discord-text-muted)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                }}
              >
                備考
              </th>
            </tr>
          </thead>
          <tbody>
            {currentWinners.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--discord-text-muted)',
                  }}
                >
                  まだ抽選が行われていません。左メニューの「抽選条件」から抽選を実行してください。
                </td>
              </tr>
            ) : (
              currentWinners.map((user, index) => (
                <tr key={user.x_id || index}>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      color: 'var(--discord-text-muted)',
                      borderBottom: '1px solid var(--discord-border)',
                    }}
                  >
                    #{index + 1}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: '14px',
                      color: 'var(--discord-text-normal)',
                      borderBottom: '1px solid var(--discord-border)',
                    }}
                  >
                    {user.name}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: 'var(--discord-text-link)',
                      borderBottom: '1px solid var(--discord-border)',
                    }}
                  >
                    @{user.x_id}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: 'var(--discord-text-normal)',
                      borderBottom: '1px solid var(--discord-border)',
                    }}
                  >
                    {user.casts[0] || '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: 'var(--discord-text-normal)',
                      borderBottom: '1px solid var(--discord-border)',
                    }}
                  >
                    {user.casts[1] || '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: 'var(--discord-text-normal)',
                      borderBottom: '1px solid var(--discord-border)',
                    }}
                  >
                    {user.casts[2] || '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      color: 'var(--discord-text-muted)',
                      borderBottom: '1px solid var(--discord-border)',
                    }}
                  >
                    {user.note || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          onClick={() => setActivePage('matching')}
          style={{
            minWidth: '220px',
            padding: '12px 28px',
            borderRadius: '4px',
            backgroundColor: 'var(--discord-accent-green)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
          }}
          disabled={currentWinners.length === 0}
        >
          マッチング開始
        </button>
      </div>
    </div>
  );
}

