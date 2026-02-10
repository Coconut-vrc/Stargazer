import React, { useCallback, useState } from 'react';
import { useAppContext } from '../stores/AppContext';
import { ConfirmModal } from '../components/ConfirmModal';

export const LotteryPage: React.FC = () => {
  const {
    setActivePage,
    repository,
    setCurrentWinners,
    matchingMode,
    setMatchingMode,
    businessMode,
    setBusinessMode,
  } = useAppContext();
  const [count, setCount] = useState(15);
  const [totalTables, setTotalTables] = useState(15);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const doRun = useCallback(() => {
    const all = repository.getAllApplyUsers();
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    setCurrentWinners(shuffled.slice(0, count));
    setActivePage('lottery');
  }, [count, repository, setActivePage, setCurrentWinners]);

  const run = useCallback(() => {
    const allCasts = repository.getAllCasts();
    const activeCastCount = allCasts.filter((c) => c.is_present).length;

    if (count > activeCastCount) {
      setAlertMessage('出席キャスト数を超えているため、抽選人数を調整してください。');
      return;
    }

    if (businessMode === 'normal' && totalTables < count) {
      setAlertMessage('総テーブル数は当選者数以上にしてください。');
      return;
    }

    if (businessMode === 'special' && count !== activeCastCount) {
      setConfirmMessage(
        `出席者数（${activeCastCount}人）と当選人数（${count}人）が一致していませんがよろしいですか？`
      );
      return;
    }
    if (businessMode === 'normal' && totalTables !== activeCastCount) {
      setConfirmMessage(
        `出席者数（${activeCastCount}人）と総テーブル数（${totalTables}人）が一致していませんがよろしいですか？`
      );
      return;
    }

    doRun();
  }, [businessMode, count, totalTables, repository, doRun]);

  const handleConfirmOk = useCallback(() => {
    doRun();
    setConfirmMessage(null);
  }, [doRun]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmMessage(null);
  }, []);

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h1 className="page-header-title page-header-title--sm">抽選条件</h1>
        <p
          className="page-header-subtitle"
          style={{
            fontSize: '12px',
            marginBottom: '20px',
          }}
        >
          営業モードと抽選条件を選択してください
        </p>

        <div
          style={{
            marginBottom: '18px',
            display: 'flex',
            gap: '8px',
          }}
        >
            <button
              type="button"
              onClick={() => setBusinessMode('special')}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '6px',
                border:
                  businessMode === 'special'
                    ? '1px solid var(--discord-accent-blue)'
                    : '1px solid var(--discord-border)',
                backgroundColor:
                  businessMode === 'special'
                    ? 'var(--discord-accent-blue)'
                    : 'var(--discord-bg-secondary)',
                color: businessMode === 'special' ? '#fff' : 'var(--discord-text-normal)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              特殊営業（完全リクイン制）
            </button>
            <button
              type="button"
              onClick={() => setBusinessMode('normal')}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '6px',
                border:
                  businessMode === 'normal'
                    ? '1px solid var(--discord-accent-blue)'
                    : '1px solid var(--discord-border)',
                backgroundColor:
                  businessMode === 'normal'
                    ? 'var(--discord-accent-blue)'
                    : 'var(--discord-bg-secondary)',
                color: businessMode === 'normal' ? '#fff' : 'var(--discord-text-normal)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              通常営業
            </button>
        </div>

        <div className="form-group">
          <label className="form-label">
            {businessMode === 'special' ? '当選人数' : '当選者数'}
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
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4)',
              }}
            />
            {businessMode === 'special' && (
              <span className="form-inline-note">※ 抽選で選ぶ最大人数</span>
            )}
          </div>
        </div>

        {businessMode === 'normal' && (
          <div className="form-group">
            <label className="form-label">総テーブル数</label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <input
                type="number"
                value={totalTables}
                min={count}
                onChange={(e) => setTotalTables(Number(e.target.value))}
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
                  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4)',
                }}
              />
              <span className="form-inline-note">※ 当選者を含む、用意済みテーブルの総数</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '26px' }}>
          <label className="form-label">マッチング方式</label>
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
          className="btn-primary"
          style={{ width: '100%', marginTop: '4px' }}
        >
          抽選を開始する
        </button>
      </div>

      {confirmMessage && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={handleConfirmOk}
          onCancel={handleConfirmCancel}
          confirmLabel="OK"
          type="confirm"
        />
      )}
      {alertMessage && (
        <ConfirmModal
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
          type="alert"
        />
      )}
    </div>
  );
};
