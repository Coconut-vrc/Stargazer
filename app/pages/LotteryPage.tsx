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
        <p className="page-header-subtitle" style={{ fontSize: '12px', marginBottom: '20px' }}>
          営業モードと抽選条件を選択してください
        </p>

        <div className="btn-toggle-group" style={{ marginBottom: '18px' }}>
          <button
            type="button"
            onClick={() => setBusinessMode('special')}
            className={`btn-toggle ${businessMode === 'special' ? 'active' : ''}`}
          >
            特殊営業（完全リクイン制）
          </button>
          <button
            type="button"
            onClick={() => setBusinessMode('normal')}
            className={`btn-toggle ${businessMode === 'normal' ? 'active' : ''}`}
          >
            通常営業
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">
            {businessMode === 'special' ? '当選人数' : '当選者数'}
          </label>
          <div className="form-inline-group">
            <input
              type="number"
              value={count}
              min={1}
              onChange={(e) => setCount(Number(e.target.value))}
              className="form-number-input"
            />
            {businessMode === 'special' && (
              <span className="form-inline-note">※ 抽選で選ぶ最大人数</span>
            )}
          </div>
        </div>

        {businessMode === 'normal' && (
          <div className="form-group">
            <label className="form-label">総テーブル数</label>
            <div className="form-inline-group">
              <input
                type="number"
                value={totalTables}
                min={count}
                onChange={(e) => setTotalTables(Number(e.target.value))}
                className="form-number-input"
              />
              <span className="form-inline-note">※ 当選者を含む、用意済みテーブルの総数</span>
            </div>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '26px' }}>
          <label className="form-label">マッチング方式</label>
          <div className="btn-option-group">
            <button
              type="button"
              onClick={() => setMatchingMode('random')}
              className={`btn-option ${matchingMode === 'random' ? 'active' : ''}`}
            >
              <span>ランダムマッチング（希望優先）</span>
              <span className="btn-option-status">
                {matchingMode === 'random' ? '選択中' : 'クリックして選択'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMatchingMode('rotation')}
              className={`btn-option ${matchingMode === 'rotation' ? 'active' : ''}`}
            >
              <span>循環方式マッチング（ローテーション）</span>
              <span className="btn-option-status">
                {matchingMode === 'rotation' ? '選択中' : 'クリックして選択'}
              </span>
            </button>
          </div>
        </div>

        <button onClick={run} className="btn-primary" style={{ width: '100%', marginTop: '4px' }}>
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
