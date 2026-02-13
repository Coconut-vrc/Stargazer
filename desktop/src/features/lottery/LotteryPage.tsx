import React, { useCallback, useState } from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AppSelect } from '@/components/AppSelect';
import { MATCHING_TYPE_CODES, MATCHING_TYPE_LABELS, isCompleteMatching, isVacantMatching } from '@/features/matching/types/matching-type-codes';

export const LotteryPage: React.FC = () => {
  const {
    setActivePage,
    repository,
    setCurrentWinners,
    setTotalTables: setTotalTablesInContext,
    matchingTypeCode,
    setMatchingTypeCode,
    rotationCount,
    setRotationCount,
    totalTables,
    setTotalTables,
    groupCount,
    setGroupCount,
    usersPerGroup,
    setUsersPerGroup,
    usersPerTable,
    setUsersPerTable,
    castsPerRotation,
    setCastsPerRotation,
  } = useAppContext();

  const [count, setCount] = useState(15);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const doRun = useCallback(() => {
    const all = repository.getAllApplyUsers();
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    let takeCount = count;
    if (matchingTypeCode === 'M005') {
      takeCount = groupCount * usersPerGroup;
    }
    setCurrentWinners(shuffled.slice(0, takeCount));
    if (isVacantMatching(matchingTypeCode)) {
      setTotalTablesInContext(totalTables);
    }
    setActivePage('lottery');
  }, [count, repository, setActivePage, setCurrentWinners, matchingTypeCode, groupCount, usersPerGroup, totalTables, setTotalTablesInContext]);

  const run = useCallback(() => {
    const allCasts = repository.getAllCasts();
    const activeCastCount = allCasts.filter((c) => c.is_present).length;

    if (matchingTypeCode === 'M005') {
      const needCount = groupCount * usersPerGroup;
      const totalUsers = repository.getAllApplyUsers().length;
      if (needCount > totalUsers) {
        setAlertMessage(`応募者数（${totalUsers}名）が足りません。グループ数×1グループ人数は${totalUsers}名以下にしてください。`);
        return;
      }
      doRun();
      return;
    }

    if (matchingTypeCode === 'M006') {
      if (count % usersPerTable !== 0) {
        setAlertMessage('当選者数は「1テーブルあたりのユーザー数」で割り切れる値にしてください。');
        return;
      }
      if (activeCastCount % castsPerRotation !== 0) {
        setAlertMessage('出席キャスト数が「1ローテあたりのキャスト数」で割り切れません。');
        return;
      }
      doRun();
      return;
    }

    if (count > activeCastCount) {
      setAlertMessage('出席キャスト数を超えているため、抽選人数を調整してください。');
      return;
    }

    if (isVacantMatching(matchingTypeCode) && totalTables < count) {
      setAlertMessage('総テーブル数は当選者数以上にしてください。');
      return;
    }

    if (isCompleteMatching(matchingTypeCode) && count !== activeCastCount) {
      setConfirmMessage(
        `出席者数（${activeCastCount}人）と当選人数（${count}人）が一致していませんがよろしいですか？`
      );
      return;
    }
    if (isVacantMatching(matchingTypeCode) && totalTables !== activeCastCount) {
      setConfirmMessage(
        `出席者数（${activeCastCount}人）と総テーブル数（${totalTables}人）が一致していませんがよろしいですか？`
      );
      return;
    }

    doRun();
  }, [matchingTypeCode, count, totalTables, groupCount, usersPerGroup, usersPerTable, castsPerRotation, repository, doRun]);

  const handleConfirmOk = useCallback(() => {
    doRun();
    setConfirmMessage(null);
  }, [doRun]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmMessage(null);
  }, []);

  const showCountInput = matchingTypeCode !== 'M005';
  const countLabel = matchingTypeCode === 'M005' ? null : isCompleteMatching(matchingTypeCode) ? '当選人数' : '当選者数';

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

        {isVacantMatching(matchingTypeCode) && (
          <div className="form-group">
            <label className="form-label">総テーブル数</label>
            <div className="form-inline-group">
              <input
                type="number"
                value={totalTables}
                min={count}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTotalTables(Number.isFinite(v) && v >= count ? v : totalTables);
                }}
                className="form-number-input"
              />
              <span className="form-inline-note">※ 当選者を含む、用意済みテーブルの総数</span>
            </div>
          </div>
        )}

        {matchingTypeCode === 'M005' && (
          <>
            <div className="form-group">
              <label className="form-label">グループ数</label>
              <input
                type="number"
                value={groupCount}
                min={1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setGroupCount(Number.isFinite(v) && v >= 1 ? v : groupCount);
                }}
                className="form-number-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">1グループあたりの人数</label>
              <input
                type="number"
                value={usersPerGroup}
                min={1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setUsersPerGroup(Number.isFinite(v) && v >= 1 ? v : usersPerGroup);
                }}
                className="form-number-input"
              />
              <p className="form-inline-note">※ 総ユーザー数 = グループ数 × 1グループの人数</p>
            </div>
          </>
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
