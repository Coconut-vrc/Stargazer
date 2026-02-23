import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useAppContext } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AppSelect } from '@/components/AppSelect';
import { MATCHING_TYPE_CODES_SELECTABLE, MATCHING_TYPE_LABELS, isTableBasedMatching } from '@/features/matching/types/matching-type-codes';
import { buildTsvContent } from '@/common/downloadCsv';
import { parseLotteryResultTsv } from '@/common/lotteryImport';
import { invoke } from '@/tauri';
import { isTauri } from '@/tauri';
import { InputModal } from '@/components/InputModal';
import { LotteryTemplate } from './types/lottery-template';
import { Save, Trash2 } from 'lucide-react';

const PREF_NAME = 'lottery-pref';
const TEMPLATES_PREF_NAME = 'lottery-templates';

interface LotteryPref {
  count: number;
  matchingTypeCode: string;
  rotationCount: number;
  totalTables: number;
  usersPerTable: number;
  castsPerRotation: number;
  allowM003EmptySeats?: boolean;
}

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
    allowM003EmptySeats,
    setAllowM003EmptySeats,
  } = useAppContext();

  const [count, setCount] = useState(1);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showGuaranteedSelect, setShowGuaranteedSelect] = useState(false);
  const [prefLoaded, setPrefLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // テンプレート関連
  const [templates, setTemplates] = useState<LotteryTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateConfirmMessage, setTemplateConfirmMessage] = useState<{ message: string, action: () => void } | null>(null);

  // pref読み込み（初回マウント時）
  useEffect(() => {
    if (!isTauri()) { setPrefLoaded(true); return; }
    invoke<string | null>('read_pref_json', { name: PREF_NAME })
      .then((raw) => {
        if (raw) {
          try {
            const pref: LotteryPref = JSON.parse(raw);
            if (typeof pref.count === 'number' && pref.count >= 1) setCount(pref.count);
            if (pref.matchingTypeCode) setMatchingTypeCode(pref.matchingTypeCode as typeof matchingTypeCode);
            if (typeof pref.rotationCount === 'number' && pref.rotationCount >= 1) setRotationCount(pref.rotationCount);
            if (typeof pref.totalTables === 'number' && pref.totalTables >= 1) setTotalTables(pref.totalTables);
            if (typeof pref.usersPerTable === 'number' && pref.usersPerTable >= 1) setUsersPerTable(pref.usersPerTable);
            if (typeof pref.castsPerRotation === 'number' && pref.castsPerRotation >= 1) setCastsPerRotation(pref.castsPerRotation);
            if (typeof pref.allowM003EmptySeats === 'boolean') setAllowM003EmptySeats(pref.allowM003EmptySeats);
          } catch { /* ignore parse errors */ }
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setPrefLoaded(true));

    invoke<string | null>('read_pref_json', { name: TEMPLATES_PREF_NAME })
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as LotteryTemplate[];
            if (Array.isArray(parsed)) setTemplates(parsed);
          } catch { /* ignore parse errors */ }
        }
      })
      .catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pref保存（値が変更されたとき）
  useEffect(() => {
    if (!prefLoaded || !isTauri()) return;
    const pref: LotteryPref = {
      count,
      matchingTypeCode,
      rotationCount,
      totalTables,
      usersPerTable,
      castsPerRotation,
      allowM003EmptySeats,
    };
    invoke('write_pref_json', { name: PREF_NAME, content: JSON.stringify(pref) }).catch(() => { /* ignore */ });
  }, [count, matchingTypeCode, rotationCount, totalTables, usersPerTable, castsPerRotation, allowM003EmptySeats, prefLoaded]);

  // テンプレート関連メソッド
  const saveTemplates = useCallback((newTemplates: LotteryTemplate[]) => {
    setTemplates(newTemplates);
    if (isTauri()) {
      invoke('write_pref_json', { name: TEMPLATES_PREF_NAME, content: JSON.stringify(newTemplates) }).catch(() => { });
    }
  }, []);

  const handleSaveTemplateSubmit = useCallback((values: Record<string, string>) => {
    const name = values.templateName;
    if (!name) return;

    const newTemplate: LotteryTemplate = {
      id: Date.now().toString(),
      name,
      settings: {
        matchingTypeCode,
        rotationCount,
        totalTables,
        usersPerTable,
        castsPerRotation,
        allowM003EmptySeats,
      }
    };

    saveTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setShowSaveTemplateModal(false);
  }, [matchingTypeCode, rotationCount, totalTables, usersPerTable, castsPerRotation, allowM003EmptySeats, templates, saveTemplates]);

  const handleDeleteTemplate = useCallback(() => {
    if (!selectedTemplateId) return;

    setTemplateConfirmMessage({
      message: '選択中のテンプレートを削除します。\nよろしいですか？',
      action: () => {
        const newTemplates = templates.filter(t => t.id !== selectedTemplateId);
        saveTemplates(newTemplates);
        setSelectedTemplateId('');
        setTemplateConfirmMessage(null);
      }
    });
  }, [selectedTemplateId, templates, saveTemplates]);

  const handleOverwriteTemplate = useCallback(() => {
    if (!selectedTemplateId) return;
    const target = templates.find(t => t.id === selectedTemplateId);
    if (!target) return;

    setTemplateConfirmMessage({
      message: `選択中のテンプレート「${target.name}」を現在の設定で上書きします。\nよろしいですか？`,
      action: () => {
        const newTemplates = templates.map(t => {
          if (t.id === selectedTemplateId) {
            return {
              ...t,
              settings: {
                matchingTypeCode,
                rotationCount,
                totalTables,
                usersPerTable,
                castsPerRotation,
                allowM003EmptySeats,
              }
            };
          }
          return t;
        });
        saveTemplates(newTemplates);
        setTemplateConfirmMessage(null);
      }
    });
  }, [selectedTemplateId, templates, matchingTypeCode, rotationCount, totalTables, usersPerTable, castsPerRotation, allowM003EmptySeats, saveTemplates]);

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
      const importedGuaranteed = users.filter(u => u.is_guaranteed);
      setGuaranteedWinners(importedGuaranteed);
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
  }, [setCurrentWinners, setGuaranteedWinners, setActivePage]);

  const doRun = useCallback(() => {
    const all = repository.getAllApplyUsers();
    const guaranteedIds = new Set(guaranteedWinners.map(w => w.x_id));
    const eligible = all.filter(u => !guaranteedIds.has(u.x_id));
    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    const lotteryWinners = shuffled.slice(0, count);
    const winners = [...guaranteedWinners.map(w => ({ ...w, is_guaranteed: true })), ...lotteryWinners];
    setCurrentWinners(winners);
    setActivePage('lottery');
    if (isTauri() && winners.length > 0) {
      // 現在の表の形に合わせたヘッダーを作成
      const maxCastCols = winners.reduce((max, u) => {
        const c = u.casts.filter(x => x && x.trim() !== '').length;
        return c > max ? c : max;
      }, 3);

      const header = ['ユーザー', 'X ID'];
      for (let i = 0; i < maxCastCols; i++) header.push(`希望${i + 1}`);
      header.push('区分');

      const rows = winners.map((u) => {
        const r = [u.name || '', u.x_id || ''];
        for (let i = 0; i < maxCastCols; i++) r.push(u.casts[i] || '');
        r.push(u.is_guaranteed ? '確定' : '抽選');
        return r;
      });

      const content = buildTsvContent([header, ...rows]);
      invoke('write_backup_lottery_tsv', { content }).catch(() => { });
    }
  }, [count, repository, setActivePage, setCurrentWinners, guaranteedWinners]);

  const run = useCallback(() => {
    const allCasts = repository.getAllCasts();
    const activeCastCount = allCasts.filter((c) => c.is_present).length;
    const totalWinners = count + guaranteedWinners.length;

    if (matchingTypeCode === 'M003') {
      const unitCount = activeCastCount / castsPerRotation;
      const userTableCount = Math.ceil(totalWinners / usersPerTable);

      if (totalTables < unitCount) {
        setAlertMessage(`総テーブル数（${totalTables}）がキャストのユニット数（${unitCount}）より少なくなっています。\nすべてのキャストが同時に配置できるよう、総テーブル数は${unitCount}以上に設定してください。`);
        return;
      }
      if (totalTables < userTableCount) {
        setAlertMessage(`総テーブル数（${totalTables}）が当選者配置に必要なテーブル数（${userTableCount}）より少なくなっています。`);
        return;
      }

      const hasEmptySeats = totalWinners % usersPerTable !== 0;
      const hasEmptyTables = totalTables > userTableCount;

      if (!allowM003EmptySeats && (hasEmptySeats || hasEmptyTables)) {
        if (hasEmptySeats) {
          setAlertMessage(`当選者数（${totalWinners}名）が「1テーブルあたりのユーザー数（${usersPerTable}）」で割り切れないため端数の空席が発生します。\n「端数の空席・手動指定による空きテーブルの発生を許可する」にチェックを入れると、空席込みで抽選を実行できます。`);
        } else {
          setAlertMessage(`指定された条件（総テーブル数${totalTables}）では誰も座らない完全な空きテーブルが発生します。\n「端数の空席・手動指定による空きテーブルの発生を許可する」にチェックを入れてください。`);
        }
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
  }, [matchingTypeCode, count, guaranteedWinners, totalTables, usersPerTable, castsPerRotation, allowM003EmptySeats, repository, doRun]);

  const handleConfirmOk = useCallback(() => {
    doRun();
    setConfirmMessage(null);
  }, [doRun]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmMessage(null);
  }, []);

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

        {/* テンプレート操作エリア */}
        <div className="form-group" style={{
          padding: '12px',
          backgroundColor: 'var(--discord-background-secondary)',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                <Save size={14} /> テンプレート
              </label>
              <AppSelect
                value={selectedTemplateId || 'unselected'}
                onValueChange={(v) => {
                  const newId = v === 'unselected' ? '' : v;
                  setSelectedTemplateId(newId);
                  if (newId) {
                    const template = templates.find(t => t.id === newId);
                    if (template) {
                      setMatchingTypeCode(template.settings.matchingTypeCode as typeof matchingTypeCode);
                      setRotationCount(template.settings.rotationCount);
                      setTotalTables(template.settings.totalTables);
                      setUsersPerTable(template.settings.usersPerTable);
                      setCastsPerRotation(template.settings.castsPerRotation);
                      setAllowM003EmptySeats(template.settings.allowM003EmptySeats ?? false);
                    }
                  }
                }}
                options={[
                  { value: 'unselected', label: templates.length > 0 ? '未選択（読み込み）' : '保存されたテンプレートなし' },
                  ...templates.map(t => ({ value: t.id, label: t.name }))
                ]}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0 10px', height: '40px', fontSize: '13px' }}
                onClick={() => setShowSaveTemplateModal(true)}
                title="現在の条件を新規保存"
              >
                新規保存
              </button>
              {selectedTemplateId && (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0 10px', height: '40px', fontSize: '13px' }}
                    onClick={handleOverwriteTemplate}
                    title="現在の条件で上書き保存"
                  >
                    上書き
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    style={{ padding: '0 10px', height: '40px', backgroundColor: 'var(--discord-status-danger)' }}
                    onClick={handleDeleteTemplate}
                    title="テンプレートを削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 1. ローテーション回数＋総テーブル数（2列グリッド） */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {/* 左列: ローテーション回数（共通） */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>ローテーション回数</label>
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

          {/* 右列: 総テーブル数 */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>総テーブル数</label>
            <input
              type="number"
              value={totalTables}
              min={1}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTotalTables(Number.isFinite(v) && v >= 1 ? v : totalTables);
              }}
              className="form-number-input"
            />
            <p className="form-inline-note" style={{ marginTop: 4 }}>
              ※ 全形式で共通
            </p>
          </div>
        </div>

        {/* 2. マッチング形式 */}
        <div className="form-group" style={{ maxWidth: '400px', marginBottom: '16px' }}>
          <label className="form-label" style={{ marginBottom: '6px' }}>マッチング形式（コード M001～M002）</label>
          <AppSelect
            value={MATCHING_TYPE_CODES_SELECTABLE.includes(matchingTypeCode) ? matchingTypeCode : 'M001'}
            onValueChange={(v) => setMatchingTypeCode(v as typeof matchingTypeCode)}
            options={MATCHING_TYPE_CODES_SELECTABLE.map((code) => ({
              value: code,
              label: `${code}: ${MATCHING_TYPE_LABELS[code]}`,
            }))}
          />
        </div>

        {/* 3. 確定当選枠＋当選者数（2列グリッド） */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {/* 左列: 確定当選枠 */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>確定当選枠</label>
            <div style={{ display: 'flex', alignItems: 'center', height: '40px', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowGuaranteedSelect(true)}
                className="btn-secondary"
                style={{ padding: '0 12px', height: '100%', fontSize: '13px' }}
              >
                確定当選者を選択
              </button>
              <span className="form-inline-note" style={{ margin: 0, fontSize: '12px' }}>({guaranteedWinners.length}名)</span>
            </div>
            <p className="form-inline-note" style={{ marginTop: 4, lineHeight: 1.3 }}>
              抽選せずに確定で当選させるユーザー
            </p>
          </div>

          {/* 右列: 当選者数（抽選枠） */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: '6px' }}>{countLabel}</label>
            <div className="form-inline-group" style={{ height: '40px' }}>
              <input
                type="number"
                value={count}
                min={1}
                step={1}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 1) {
                    setCount(v);
                  }
                }}
                style={{ height: '100%' }}
              />
            </div>
            {matchingTypeCode === 'M003' && usersPerTable > 1 && (count + guaranteedWinners.length) % usersPerTable !== 0 && (
              <p className="form-inline-note" style={{ marginTop: 4, lineHeight: 1.3, color: 'var(--discord-accent-yellow, #f0b232)' }}>※ 最後のテーブルに{usersPerTable - ((count + guaranteedWinners.length) % usersPerTable)}名分の空席が発生します</p>
            )}
          </div>
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

        {/* 4. 多対多ローテーション条件設定 (タイトル部) */}
        {matchingTypeCode === 'M003' && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--discord-background-secondary)', borderRadius: '8px', border: '1px solid var(--discord-border)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--discord-text-normal)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              多対多ローテーション条件設定
            </h3>

            {/* 1テーブルあたりのユーザー数＋1ローテあたりのキャスト数（2列グリッド） */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: '6px' }}>1テーブルのユーザー数</label>
                <div className="form-inline-group">
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
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: '6px' }}>1ローテのキャスト数</label>
                <div className="form-inline-group">
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
                </div>
                <p className="form-inline-note" style={{ marginTop: 4 }}>※ 総数がこの倍数でないと警告</p>
              </div>
            </div>

            {/* 空席・空きテーブルの許容設定 */}
            <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={allowM003EmptySeats}
                  onChange={(e) => setAllowM003EmptySeats(e.target.checked)}
                />
                端数の空席・手動指定による空きテーブルを許可する
              </label>
            </div>
          </div>
        )}

        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".tsv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'row', marginTop: 'auto' }}>
          <button onClick={handleImportTsv} className="btn-secondary" style={{ flex: 1, height: '44px' }}>
            抽選結果をインポート
          </button>
          <button onClick={run} className="btn-primary" style={{ flex: 1.5, height: '44px' }}>
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
      {templateConfirmMessage && (
        <ConfirmModal
          message={templateConfirmMessage.message}
          onConfirm={templateConfirmMessage.action}
          onCancel={() => setTemplateConfirmMessage(null)}
          confirmLabel="OK"
          type="confirm"
        />
      )}
      {showSaveTemplateModal && (
        <InputModal
          title="テンプレートの保存"
          description="現在の条件設定に名前をつけて保存します。"
          fields={[{ key: 'templateName', label: 'テンプレート名', placeholder: '例：通常営業、多対多イベント' }]}
          onSubmit={handleSaveTemplateSubmit}
          onCancel={() => setShowSaveTemplateModal(false)}
          submitLabel="保存する"
        />
      )}
    </div>
  );
};
