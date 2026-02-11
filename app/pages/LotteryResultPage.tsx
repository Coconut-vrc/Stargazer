import React, { useState } from 'react';
import { useAppContext } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import { ConfirmModal } from '../components/ConfirmModal';
import { RESULT_SHEET_PREFIX } from '../common/sheetColumns';
import { ALERT } from '../common/copy';

export const LotteryResultPage: React.FC = () => {
  const { currentWinners, setActivePage, repository } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const sheetService = new SheetService();

  const handleExport = async () => {
    if (currentWinners.length === 0) {
      setAlertMessage(ALERT.NO_WINNERS_EXPORT);
      return;
    }

    const userSheetUrl = repository.getUserSheetUrl();
    if (!userSheetUrl) {
      setAlertMessage(ALERT.NO_USER_SHEET_URL_EXPORT);
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

      // シート名の生成（Google Sheetsのシート名制限に準拠）
      const baseName = `${RESULT_SHEET_PREFIX}${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
      // シート名は最大100文字、制御文字を排除
      const sheetName = baseName.slice(0, 100).replace(/[\x00-\x1F\x7F\[\]\\\/\?*:]/g, '');

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
                  <td className="table-cell" style={{ fontSize: '13px', color: 'var(--discord-text-link)' }}>
                    @{user.x_id}
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

