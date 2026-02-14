import React, { useState } from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ALERT, EXTERNAL_LINK } from '@/common/copy';
import { downloadCsv } from '@/common/downloadCsv';
import { openInDefaultBrowser } from '@/common/openExternal';

export const LotteryResultPage: React.FC = () => {
  const { currentWinners, setActivePage } = useAppContext();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const handleExportCsv = () => {
    if (currentWinners.length === 0) {
      setAlertMessage(ALERT.NO_WINNERS_EXPORT);
      return;
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const filename = `抽選結果_${yyyy}${mm}${dd}_${hh}${mi}${ss}.csv`;

    const header = [
      'timestamp',
      'name',
      'x_id',
      'first_flag',
      '希望1',
      '希望2',
      '希望3',
      '意気込み',
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

    downloadCsv([header, ...rows], filename);
    setAlertMessage('CSV をダウンロードしました。');
  };

  return (
    <div className="fade-in page-wrapper">
      <header className="page-header" style={{ marginBottom: '16px' }}>
        <h1 className="page-header-title page-header-title--lg">マッチング構成確認</h1>
        <p className="page-header-subtitle">当選者と希望キャストを再度確認してください</p>
      </header>

      <div className="table-container">
        <table style={{ minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--discord-bg-secondary)' }}>
              <th className="table-header-cell" style={{ width: '60px' }}>#</th>
              <th className="table-header-cell">ユーザー</th>
              <th className="table-header-cell">X ID</th>
              <th className="table-header-cell">希望1</th>
              <th className="table-header-cell">希望2</th>
              <th className="table-header-cell">希望3</th>
              <th className="table-header-cell">意気込み</th>
            </tr>
          </thead>
          <tbody>
            {currentWinners.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell" style={{ padding: '32px', textAlign: 'center', color: 'var(--discord-text-muted)' }}>
                  まだ抽選が行われていません。左メニューの「抽選条件」から抽選を実行してください。
                </td>
              </tr>
            ) : (
              currentWinners.map((user, index) => (
                <tr key={`${user.x_id ?? user.name ?? ''}-${index}`}>
                  <td className="table-cell" style={{ fontSize: '12px', color: 'var(--discord-text-muted)' }}>
                    #{index + 1}
                  </td>
                  <td className="table-cell" style={{ fontSize: '14px' }}>{user.name}</td>
                  <td
                    className="table-cell text-x-id--clickable"
                    style={{ fontSize: '13px', color: 'var(--discord-text-link)', cursor: user.x_id ? 'pointer' : 'default' }}
                    onClick={() => {
                      const handle = user.x_id?.replace(/^@/, '');
                      if (handle) setPendingUrl(`https://x.com/${handle}`);
                    }}
                  >
                    {user.x_id ? `@${user.x_id.replace(/^@/, '')}` : '—'}
                  </td>
                  <td className="table-cell" style={{ fontSize: '13px' }}>{user.casts[0] || '—'}</td>
                  <td className="table-cell" style={{ fontSize: '13px' }}>{user.casts[1] || '—'}</td>
                  <td className="table-cell" style={{ fontSize: '13px' }}>{user.casts[2] || '—'}</td>
                  <td className="table-cell" style={{ fontSize: '12px', color: 'var(--discord-text-muted)' }}>
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
          onClick={handleExportCsv}
          style={{
            padding: '10px 24px',
            borderRadius: '4px',
            backgroundColor: 'var(--discord-bg-secondary)',
            color: 'var(--discord-text-normal)',
            border: '1px solid var(--discord-border)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: currentWinners.length === 0 ? 'not-allowed' : 'pointer',
            opacity: currentWinners.length === 0 ? 0.6 : 1,
          }}
          disabled={currentWinners.length === 0}
        >
          抽選結果をCSVでダウンロード
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

      {pendingUrl && (
        <ConfirmModal
          title={EXTERNAL_LINK.MODAL_TITLE}
          message={`${pendingUrl}\n\nXのプロフィールページを開きますか？`}
          onConfirm={async () => {
            await openInDefaultBrowser(pendingUrl);
            setPendingUrl(null);
          }}
          onCancel={() => setPendingUrl(null)}
          confirmLabel={EXTERNAL_LINK.CONFIRM_LABEL}
          cancelLabel={EXTERNAL_LINK.CANCEL_LABEL}
          type="confirm"
        />
      )}

      {alertMessage && (
        <ConfirmModal
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
          confirmLabel="OK"
          type="alert"
        />
      )}
    </div>
  );
};
