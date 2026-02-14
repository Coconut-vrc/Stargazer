import React, { useCallback, useState } from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AppSelect } from '@/components/AppSelect';
import { MATCHING_TYPE_CODES, MATCHING_TYPE_LABELS, isCompleteMatching } from '@/features/matching/types/matching-type-codes';

export const LotteryPage: React.FC = () => {
  const {
    setActivePage,
    repository,
    setCurrentWinners,
    guaranteedWinners,
    setGuaranteedWinners,
    matchingTypeCode,
    setMatchingTypeCode,
    rotationCount,
    setRotationCount,
    usersPerTable,
    setUsersPerTable,
    castsPerRotation,
    setCastsPerRotation,
  } = useAppContext();

  const [count, setCount] = useState(15);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showGuaranteedSelect, setShowGuaranteedSelect] = useState(false);

  const doRun = useCallback(() => {
    const all = repository.getAllApplyUsers();
    // 確定当選者を除外して抽選
    const guaranteedIds = new Set(guaranteedWinners.map(w => w.x_id));
    const eligible = all.filter(u => !guaranteedIds.has(u.x_id));
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    const lotteryWinners = shuffled.slice(0, count);
    // 確定当選者と抽選当選者を結合
    setCurrentWinners([...guaranteedWinners, ...lotteryWinners]);
    setActivePage('lottery');
  }, [count, repository, setActivePage, setCurrentWinners, guaranteedWinners]);

  const run = useCallback(() => {
    const allCasts = repository.getAllCasts();
    const activeCastCount = allCasts.filter((c) => c.is_present).length;
    const totalWinners = count + guaranteedWinners.length;

    if (matchingTypeCode === 'M006') {
      if (totalWinners % usersPerTable !== 0) {
        setAlertMessage(`当選者数（確定枠${guaranteedWinners.length}名 + 抽選枠${count}名 = ${totalWinners}名）は「1テーブルあたりのユーザー数」で割り切れる値にしてください。`);
        return;
      }
      if (activeCastCount % castsPerRotation !== 0) {
        setAlertMessage('出席キャスト数が「1ローテあたりのキャスト数」で割り切れません。');
        return;
      }
      doRun();
      return;
    }

    if (totalWinners > activeCastCount) {
      setAlertMessage(`当選者数の合計（確定枠${guaranteedWinners.length}名 + 抽選枠${count}名 = ${totalWinners}名）が出席キャスト数を超えています。`);
      return;
    }

    if (isCompleteMatching(matchingTypeCode) && totalWinners !== activeCastCount) {
      setConfirmMessage(
        `出席者数（${activeCastCount}人）と当選人数（確定枠${guaranteedWinners.length}名 + 抽選枠${count}名 = ${totalWinners}名）が一致していませんがよろしいですか？`
      );
      return;
    }

    doRun();
  }, [matchingTypeCode, count, guaranteedWinners, usersPerTable, castsPerRotation, repository, doRun]);

  const handleConfirmOk = useCallback(() => {
    doRun();
    setConfirmMessage(null);
  }, [doRun]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmMessage(null);
  }, []);

  const showCountInput = true;
  const countLabel = isCompleteMatching(matchingTypeCode) ? '抽選枠人数' : '当選者数（抽選枠）';

  const handleToggleGuaranteed = (user: import('@/common/types/entities').UserBean) => {
    const isSelected = guaranteedWinners.some(w => w.x_id === user.x_id);
    if (isSelected) {
      setGuaranteedWinners(guaranteedWinners.filter(w => w.x_id !== user.x_id));
    } else {
      setGuaranteedWinners([...guaranteedWinners, user]);
    }
  };

  const allUsers = repository.getAllApplyUsers();

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h1 className="page-header-title page-header-title--sm">抽選条件</h1>
        <p className="page-header-subtitle page-header-subtitle--tight">
          マッチング形式と条件を選択してください
        </p>

        <div className="form-group" style={{ maxWidth: '400px' }}>
          <label className="form-label">マッチング形式（区分コード M001～M006）</label>
          <AppSelect
            value={matchingTypeCode}
            onValueChange={(v) => setMatchingTypeCode(v as typeof matchingTypeCode)}
            options={MATCHING_TYPE_CODES.map((code) => ({
              value: code,
              label: `${code}: ${MATCHING_TYPE_LABELS[code]}`,
            }))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">ローテーション回数（共通）</label>
          <div className="form-inline-group">
            <input
              type="number"
              value={rotationCount}
              min={1}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRotationCount(Number.isFinite(v) && v >= 1 ? v : rotationCount);
              }}
              className="form-number-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">確定当選枠</label>
          <p className="form-inline-note mb-12">
            抽選せずに確定で当選させるユーザーを選択できます（{guaranteedWinners.length}名選択中）
          </p>
          <button
            type="button"
            onClick={() => setShowGuaranteedSelect(!showGuaranteedSelect)}
            className="btn-secondary"
          >
            {showGuaranteedSelect ? '選択を閉じる' : '確定当選者を選択する'}
          </button>
          {showGuaranteedSelect && (
            <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', padding: '8px', borderRadius: '4px' }}>
              {allUsers.length === 0 ? (
                <p className="form-inline-note">応募者データがありません</p>
              ) : (
                allUsers.map((user) => {
                  const isSelected = guaranteedWinners.some(w => w.x_id === user.x_id);
                  return (
                    <label key={user.x_id} style={{ display: 'block', padding: '4px 0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleGuaranteed(user)}
                        style={{ marginRight: '8px' }}
                      />
                      {user.name} ({user.x_id})
                    </label>
                  );
                })
              )}
            </div>
          )}
        </div>

        {showCountInput && countLabel !== null && (
          <div className="form-group">
            <label className="form-label">{countLabel}</label>
            <div className="form-inline-group">
              <input
                type="number"
                value={count}
                min={1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCount(Number.isFinite(v) && v >= 1 ? v : count);
                }}
                className="form-number-input"
              />
              {isCompleteMatching(matchingTypeCode) && (
                <span className="form-inline-note">※ 抽選で選ぶ最大人数</span>
              )}
            </div>
          </div>
        )}

        {matchingTypeCode === 'M006' && (
          <>
            <div className="form-group">
              <label className="form-label">当選者数</label>
              <input
                type="number"
                value={count}
                min={1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCount(Number.isFinite(v) && v >= 1 ? v : count);
                }}
                className="form-number-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">1テーブルあたりのユーザー数</label>
              <input
                type="number"
                value={usersPerTable}
                min={1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setUsersPerTable(Number.isFinite(v) && v >= 1 ? v : usersPerTable);
                }}
                className="form-number-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">1ローテあたりのキャスト数</label>
              <input
                type="number"
                value={castsPerRotation}
                min={1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCastsPerRotation(Number.isFinite(v) && v >= 1 ? v : castsPerRotation);
                }}
                className="form-number-input"
              />
              <p className="form-inline-note">※ キャスト総数がこの値で割り切れる必要があります</p>
            </div>
          </>
        )}

        <button onClick={run} className="btn-primary btn-primary--full">
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
          confirmLabel="OK"
          type="alert"
        />
      )}
    </div>
  );
};
