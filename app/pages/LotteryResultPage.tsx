import React, { useState } from 'react';
import { useAppContext } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import { ConfirmModal } from '../components/ConfirmModal';

export const LotteryResultPage: React.FC = () => {
  const { currentWinners, setActivePage, repository } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const sheetService = new SheetService();

  const handleExport = async () => {
    if (currentWinners.length === 0) {
      setAlertMessage('当選者がいないため、エクスポートできません。');
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

      const sheetName = `抽選結果_${yyyy}${mm}${dd}_${hh}${mi}${ss}`;

      const header = [
        'timestamp',
        'name',
        'x_id',
        'first_flag',
        '希望1',
        '希望2',
        '希望3',
        'note',
        'is_pair_ticket',
      ];

      const rows = currentWinners.map((user) => [
        user.timestamp || '',
        user.name || '',
        user.x_id || '',
        user.first_flag || '',
        user.casts[0] || '',
        user.casts[1] || '',
        user.casts[2] || '',
        user.note || '',
        user.is_pair_ticket ? '1' : '0',
      ]);

      await sheetService.createSheetAndWriteData(userSheetUrl, sheetName, [header, ...rows]);
      setAlertMessage(`スプレッドシートに「${sheetName}」として保存しました。`);
    } catch (e) {
      console.error('抽選結果エクスポート失敗:', e);
      setAlertMessage('抽選結果のエクスポートに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fade-in page-wrapper">
      <header className="page-header" style={{ marginBottom: '16px' }}>
        <h1 className="page-header-title page-header-title--lg">マッチング構成確認</h1>
        <p className="page-header-subtitle">当選者と希望キャストを再度確認してください</p>
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

      <div
        style={{
          marginTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '8px',
          maxWidth: '480px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <button
          onClick={handleExport}
          style={{
            padding: '10px 24px',
            borderRadius: '4px',
            backgroundColor: 'var(--discord-bg-secondary)',
            color: 'var(--discord-text-normal)',
            border: '1px solid var(--discord-border)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: isExporting || currentWinners.length === 0 ? 'not-allowed' : 'pointer',
            opacity: isExporting || currentWinners.length === 0 ? 0.6 : 1,
          }}
          disabled={isExporting || currentWinners.length === 0}
        >
          {isExporting ? 'エクスポート中...' : '抽選結果をシートに保存'}
        </button>
        <button
          onClick={() => setActivePage('matching')}
          style={{
            padding: '10px 24px',
            borderRadius: '4px',
            backgroundColor: 'var(--discord-accent-green)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: '15px',
            cursor: currentWinners.length === 0 ? 'not-allowed' : 'pointer',
            opacity: currentWinners.length === 0 ? 0.6 : 1,
          }}
          disabled={currentWinners.length === 0}
        >
          マッチング開始
        </button>
      </div>

      {alertMessage && (
        <ConfirmModal
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
          type="alert"
        />
      )}
    </div>
  );
}

