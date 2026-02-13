import React, { useState, useEffect } from 'react';
import type { CastBean } from '@/common/types/entities';
import { Repository } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AppSelect, type AppSelectOption } from '@/components/AppSelect';

type PersistCastsFn = (casts: CastBean[]) => void | Promise<void>;

export const NGUserManagementPage: React.FC<{
  repository: Repository;
  onPersistCasts?: PersistCastsFn;
}> = ({ repository, onPersistCasts }) => {
  const [casts, setCasts] = useState<CastBean[]>([]);
  const [selectedCastName, setSelectedCastName] = useState('');
  const [inputNgName, setInputNgName] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    const allCasts = repository.getAllCasts();
    setCasts(allCasts);
    if (allCasts.length > 0 && !selectedCastName) {
      setSelectedCastName(allCasts[0].name);
    }
  }, [repository, selectedCastName]);

  const castOptions: AppSelectOption[] = casts.map((c) => ({ value: c.name, label: c.name }));
  const selectedCast = casts.find((c) => c.name === selectedCastName);
  const ngList = selectedCast?.ng_users ?? [];
  const selectValue = selectedCastName && castOptions.some((o) => o.value === selectedCastName)
    ? selectedCastName
    : castOptions[0]?.value ?? '';

  const handleAddNg = () => {
    const nameToAdd = inputNgName.trim();
    if (!nameToAdd || !selectedCastName) return;
    const cast = casts.find((c) => c.name === selectedCastName);
    if (!cast) return;
    if (cast.ng_users.includes(nameToAdd)) {
      setAlertMessage('このユーザーは既にNGに登録されています。');
      return;
    }
    const nextCasts = casts.map((c) =>
      c.name === selectedCastName
        ? { ...c, ng_users: [...c.ng_users, nameToAdd] }
        : c
    );
    setCasts(nextCasts);
    setInputNgName('');
    repository.saveCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  };

  const handleRemoveNg = (castName: string, targetNg: string) => {
    const nextCasts = casts.map((c) =>
      c.name === castName
        ? { ...c, ng_users: c.ng_users.filter((u) => u !== targetNg) }
        : c
    );
    setCasts(nextCasts);
    repository.saveCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  };

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h1 className="page-header-title page-header-title--lg">NGユーザー管理</h1>
        <p className="page-header-subtitle form-subtitle-mb">
          キャストごとに接客しないユーザー（NG）を登録します。ここで設定したNGはマッチング時に反映されます。
        </p>

        {casts.length === 0 ? (
          <p className="form-inline-note" style={{ color: 'var(--discord-text-muted)' }}>
            キャストがまだいません。先に「キャスト管理」でキャストを登録してください。
          </p>
        ) : (
          <>
            <div className="form-group form-group-spacing">
              <label className="form-label">対象キャスト</label>
              <AppSelect
                value={selectValue}
                onValueChange={setSelectedCastName}
                options={castOptions}
                placeholder="キャストを選択"
              />
            </div>

            <div className="form-group form-group-spacing">
              <label className="form-label">NGユーザーを追加</label>
              <div className="form-inline-group" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <input
                  placeholder="ユーザー名を入力..."
                  className="form-input"
                  value={inputNgName}
                  onChange={(e) => setInputNgName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNg()}
                  style={{ flex: '1 1 200px' }}
                />
                <button onClick={handleAddNg} className="btn-primary btn-fixed-h">
                  追加
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {selectedCastName} のNGユーザー一覧（{ngList.length}名）
              </label>
              <div className="ng-list">
                {ngList.length > 0 ? (
                  ngList.map((ng) => (
                    <div key={ng} className="ng-list__chip">
                      <span>{ng}</span>
                      <button
                        type="button"
                        className="ng-list__chip-remove"
                        onClick={() => handleRemoveNg(selectedCastName, ng)}
                        aria-label={`${ng} を削除`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-italic">なし</span>
                )}
              </div>
            </div>
          </>
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
    </div>
  );
};
