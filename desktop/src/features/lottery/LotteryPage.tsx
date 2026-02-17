import React, { useCallback, useState, useRef } from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AppSelect } from '@/components/AppSelect';
import { MATCHING_TYPE_CODES_SELECTABLE, MATCHING_TYPE_LABELS, isTableBasedMatching } from '@/features/matching/types/matching-type-codes';
import { buildTsvContent } from '@/common/downloadCsv';
import { parseLotteryResultTsv } from '@/common/lotteryImport';
import { invoke } from '@/tauri';
import { isTauri } from '@/tauri';

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
    totalTables,
    setTotalTables,
    usersPerTable,
    setUsersPerTable,
    castsPerRotation,
    setCastsPerRotation,
  } = useAppContext();

  const [count, setCount] = useState(15);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showGuaranteedSelect, setShowGuaranteedSelect] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TSVインポートハンドラー
  const handleImportTsv = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setAlertMessage('ファイルの読み込みに失敗しました');
        return;
      }

      const { users, validation } = parseLotteryResultTsv(content);

      if (!validation.isValid) {
        const errorMessage = [
          '抽選結果TSVの形式が不正です:',
          '',
          ...validation.errors,
          ...(validation.warnings.length > 0 ? ['', '警告:', ...validation.warnings] : []),
        ].join('\n');
        setAlertMessage(errorMessage);
        return;
      }

      if (validation.warnings.length > 0) {
        const warningMessage = [
          `${users.length}名の当選者をインポートしました`,
          '',
          '警告:',
          ...validation.warnings,
        ].join('\n');
        setAlertMessage(warningMessage);
      }

      // 当選者を設定
      setCurrentWinners(users);
      setActivePage('lottery');
    };

    reader.onerror = () => {
      setAlertMessage('ファイルの読み込み中にエラーが発生しました');
    };

    reader.readAsText(file, 'UTF-8');

    // ファイル選択をリセット（同じファイルを再選択可能にする）
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setCurrentWinners, setActivePage]);

  const doRun = useCallback(() => {
    const all = repository.getAllApplyUsers();
    const guaranteedIds = new Set(guaranteedWinners.map(w => w.x_id));
    const eligible = all.filter(u => !guaranteedIds.has(u.x_id));
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    const lotteryWinners = shuffled.slice(0, count);
    const winners = [...guaranteedWinners, ...lotteryWinners];
    setCurrentWinners(winners);
    setActivePage('lottery');
    if (isTauri() && winners.length > 0) {
      const header = ['timestamp', 'name', 'x_id', 'first_flag', '希望1', '希望2', '希望3', '意気込み', 'is_pair_ticket'];
      const rows = winners.map((u) => [
        u.timestamp || '', u.name || '', u.x_id || '', u.first_flag || '',
        u.casts[0] || '', u.casts[1] || '', u.casts[2] || '', u.note || '',
        u.is_pair_ticket ? '1' : '0',
      ]);
      const content = buildTsvContent([header, ...rows]);
      invoke('write_backup_lottery_tsv', { content }).catch(() => { });
    }
  }, [count, repository, setActivePage, setCurrentWinners, guaranteedWinners]);

  const run = useCallback(() => {
    const allCasts = repository.getAllCasts();
    const activeCastCount = allCasts.filter((c) => c.is_present).length;
    const totalWinners = count + guaranteedWinners.length;

    if (matchingTypeCode === 'M003') {
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

    if (isTableBasedMatching(matchingTypeCode)) {
      if (totalTables < totalWinners) {
        setAlertMessage(`総テーブル数（${totalTables}）が当選者数（${totalWinners}名）より少なくなっています。`);
        return;
      }
    }

    doRun();
  }, [matchingTypeCode, count, guaranteedWinners, totalTables, usersPerTable, castsPerRotation, repository, doRun]);

  const handleConfirmOk = useCallback(() => {
    doRun();
    setConfirmMessage(null);
  }, [doRun]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmMessage(null);
  }, []);

  const showCountInput = true;
  const countLabel = '当選者数（抽選枠）';

  const handleToggleGuaranteed = (user: import('@/common/types/entities').UserBean) => {
    const isSelected = guaranteedWinners.some(w => w.x_id === user.x_id);
    let newGuaranteed: typeof guaranteedWinners;
    if (isSelected) {
      newGuaranteed = guaranteedWinners.filter(w => w.x_id !== user.x_id);
    } else {
      newGuaranteed = [...guaranteedWinners, user];
    }

    // M003の場合、確定当選者数がusersPerTableの倍数になるように調整
    if (matchingTypeCode === 'M003' && usersPerTable > 1) {
      const totalWinners = newGuaranteed.length + count;
      if (totalWinners % usersPerTable !== 0) {
        setAlertMessage(`確定当選者数と抽選枠の合計は${usersPerTable}の倍数である必要があります。現在の合計: ${totalWinners}名`);
        return;
      }
    }

    setGuaranteedWinners(newGuaranteed);
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
          <label className="form-label">マッチング形式（区分コード M000～M002）</label>
          <AppSelect
            value={MATCHING_TYPE_CODES_SELECTABLE.includes(matchingTypeCode) ? matchingTypeCode : 'M000'}
            onValueChange={(v) => setMatchingTypeCode(v as typeof matchingTypeCode)}
            options={MATCHING_TYPE_CODES_SELECTABLE.map((code) => ({
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
            onClick={() => setShowGuaranteedSelect(true)}
            className="btn-secondary"
          >
            確定当選者を選択する
          </button>
        </div>
        {showGuaranteedSelect && (
          <ConfirmModal
            type="alert"
            title="確定当選者を選択"
            message={`抽選せずに当選させるユーザーにチェックを付けます。${guaranteedWinners.length}名選択中。`}
            confirmLabel="閉じる"
            onConfirm={() => setShowGuaranteedSelect(false)}
            children={
              <div className="guaranteed-select-modal-list">
                {allUsers.length === 0 ? (
                  <p className="form-inline-note">応募者データがありません</p>
                ) : (
                  <div className="guaranteed-select-modal-list__scroll">
                    {allUsers.map((user) => {
                      const isSelected = guaranteedWinners.some((w) => w.x_id === user.x_id);
                      return (
                        <label key={user.x_id} className="guaranteed-select-modal-list__item">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleGuaranteed(user)}
                          />
                          <span className="guaranteed-select-modal-list__name">{user.name}</span>
                          <span className="guaranteed-select-modal-list__id">@{user.x_id.replace(/^@/, '')}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            }
          />
        )}

        {showCountInput && countLabel !== null && matchingTypeCode !== 'M003' && (
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
            </div>
          </div>
        )}

        {/* M001/M002用: 総テーブル数 */}
        <div className="form-group">
          <label className="form-label">総テーブル数</label>
          <input
            type="number"
            value={totalTables}
            min={1}
            disabled={matchingTypeCode === 'M003'}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTotalTables(Number.isFinite(v) && v >= 1 ? v : totalTables);
            }}
            className="form-number-input"
            style={{ opacity: matchingTypeCode === 'M003' ? 0.5 : 1, cursor: matchingTypeCode === 'M003' ? 'not-allowed' : 'text' }}
          />
          <p className="form-inline-note" style={{ marginTop: 4 }}>※ M001/M002で使用</p>
        </div>

        {/* M003用の設定 */}
        <div className="form-group">
          <label className="form-label">当選者数（抽選枠）</label>
          <input
            type="number"
            value={count}
            min={1}
            step={usersPerTable}
            disabled={matchingTypeCode !== 'M003'}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 1) {
                // usersPerTableの倍数に丸める（最小値は1）
                const rounded = Math.max(1, Math.round(v / usersPerTable) * usersPerTable);
                setCount(rounded);
              }
            }}
            className="form-number-input"
            style={{ opacity: matchingTypeCode !== 'M003' ? 0.5 : 1, cursor: matchingTypeCode !== 'M003' ? 'not-allowed' : 'text' }}
          />
          {matchingTypeCode === 'M003' && (
            <p className="form-inline-note" style={{ marginTop: 4 }}>※ {usersPerTable}の倍数で設定されます</p>
          )}
          <p className="form-inline-note" style={{ marginTop: 4 }}>※ M003で使用</p>
        </div>
        <div className="form-group">
          <label className="form-label">1テーブルあたりのユーザー数</label>
          <input
            type="number"
            value={usersPerTable}
            min={1}
            disabled={matchingTypeCode !== 'M003'}
            onChange={(e) => {
              const v = Number(e.target.value);
              setUsersPerTable(Number.isFinite(v) && v >= 1 ? v : usersPerTable);
            }}
            className="form-number-input"
            style={{ opacity: matchingTypeCode !== 'M003' ? 0.5 : 1, cursor: matchingTypeCode !== 'M003' ? 'not-allowed' : 'text' }}
          />
          <p className="form-inline-note" style={{ marginTop: 4 }}>※ M003で使用</p>
        </div>
        <div className="form-group">
          <label className="form-label">1ローテあたりのキャスト数</label>
          <input
            type="number"
            value={castsPerRotation}
            min={1}
            disabled={matchingTypeCode !== 'M003'}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCastsPerRotation(Number.isFinite(v) && v >= 1 ? v : castsPerRotation);
            }}
            className="form-number-input"
            style={{ opacity: matchingTypeCode !== 'M003' ? 0.5 : 1, cursor: matchingTypeCode !== 'M003' ? 'not-allowed' : 'text' }}
          />
          <p className="form-inline-note" style={{ marginTop: 4 }}>※ M003で使用。キャスト総数がこの倍数でないと警告されます</p>
        </div>

        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".tsv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <button onClick={handleImportTsv} className="btn-secondary btn-secondary--full">
            抽選結果TSVをインポート
          </button>
          <button onClick={run} className="btn-primary btn-primary--full">
            抽選開始
          </button>
        </div>
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
