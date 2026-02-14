import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CastBean, NGUserEntry } from '@/common/types/entities';
import { Repository } from '@/stores/AppContext';
import { useAppContext } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { InputModal } from '@/components/InputModal';
import { AppSelect, type AppSelectOption } from '@/components/AppSelect';
import type { NGJudgmentType, NGMatchingBehavior, CautionUser, NGException } from '@/features/matching/types/matching-system-types';
import { parseXUsername } from '@/common/xIdUtils';

type PersistCastsFn = (casts: CastBean[]) => void | Promise<void>;

const NG_JUDGMENT_LABELS: Record<NGJudgmentType, string> = {
  username: 'ユーザー名のみで判定',
  accountId: 'アカウントID(X)のみで判定',
  either: 'ユーザー名 OR アカウントID（どちらか一致でNG）',
};

const NG_BEHAVIOR_LABELS: Record<NGMatchingBehavior, string> = {
  warn: '警告モード（結果でハイライト・手動で入れ替え可能）',
  exclude: '除外モード（マッチング時に自動除外）',
};

function getNgEntriesFromCast(cast: CastBean): NGUserEntry[] {
  const entries = cast.ng_entries;
  if (entries && entries.length > 0) return entries;
  return (cast.ng_users ?? []).map((u) => ({ username: u }));
}

function entryToKey(entry: NGUserEntry): string {
  const u = entry.username ?? '';
  const a = entry.accountId ?? '';
  return `${u}|${a}`;
}

export const NGUserManagementPage: React.FC<{
  repository: Repository;
  onPersistCasts?: PersistCastsFn;
}> = ({ repository, onPersistCasts }) => {
  const { matchingSettings, setMatchingSettings } = useAppContext();
  const [casts, setCasts] = useState<CastBean[]>([]);
  const [selectedCastName, setSelectedCastName] = useState('');
  const [inputNgName, setInputNgName] = useState('');
  const [inputXId, setInputXId] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showCautionSelect, setShowCautionSelect] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  useEffect(() => {
    const allCasts = repository.getAllCasts();
    setCasts(allCasts);
    if (allCasts.length > 0 && !selectedCastName) {
      setSelectedCastName(allCasts[0].name);
    }
  }, [repository, selectedCastName]);

  const castOptions: AppSelectOption[] = casts.map((c) => ({ value: c.name, label: c.name }));
  const selectedCast = casts.find((c) => c.name === selectedCastName);
  const ngEntries = selectedCast ? getNgEntriesFromCast(selectedCast) : [];
  const selectValue = selectedCastName && castOptions.some((o) => o.value === selectedCastName)
    ? selectedCastName
    : castOptions[0]?.value ?? '';

  const [cautionThreshold, setCautionThreshold] = useState(
    () => matchingSettings.caution.autoRegisterThreshold,
  );
  const handleThresholdBlur = useCallback(() => {
    const n = Math.max(1, Math.floor(Number(cautionThreshold)) || 1);
    setCautionThreshold(n);
    setMatchingSettings((prev) => ({
      ...prev,
      caution: { ...prev.caution, autoRegisterThreshold: n },
    }));
  }, [cautionThreshold, setMatchingSettings]);

  const isDuplicateNg = (cast: CastBean, newEntry: NGUserEntry): boolean => {
    const existing = getNgEntriesFromCast(cast);
    const key = entryToKey(newEntry);
    return existing.some((e) => entryToKey(e) === key);
  };

  const handleAddNg = () => {
    const nameToAdd = inputNgName.trim();
    const xIdRaw = inputXId.trim();
    if (!nameToAdd || !selectedCastName) {
      setAlertMessage('ユーザー名を入力してください。');
      return;
    }

    const cast = casts.find((c) => c.name === selectedCastName);
    if (!cast) return;

    // X ID が入力されていればパース、なければ undefined（username-only 登録も可）
    const accountId = xIdRaw ? (parseXUsername(xIdRaw) ?? undefined) : undefined;
    if (xIdRaw && !accountId) {
      setAlertMessage('有効な X ID を入力してください（@username、ユーザー名、または x.com URL）。');
      return;
    }

    const newEntry: NGUserEntry = {
      username: nameToAdd,
      accountId,
    };

    if (isDuplicateNg(cast, newEntry)) {
      setAlertMessage('このユーザーは既にNGに登録されています。');
      return;
    }

    const existingEntries = getNgEntriesFromCast(cast);
    const nextEntries = existingEntries.concat(newEntry);

    const nextCasts = casts.map((c) =>
      c.name === selectedCastName
        ? { ...c, ng_entries: nextEntries, ng_users: [] }
        : c
    );
    setCasts(nextCasts);
    setInputNgName('');
    setInputXId('');
    repository.saveCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  };

  const handleRemoveNg = (castName: string, entry: NGUserEntry) => {
    const cast = casts.find((c) => c.name === castName);
    if (!cast) return;
    const existing = getNgEntriesFromCast(cast);
    const key = entryToKey(entry);
    const filtered = existing.filter((e) => entryToKey(e) !== key);

    const nextCasts = casts.map((c) => {
      if (c.name !== castName) return c;
      if (filtered.length === 0) {
        return { ...c, ng_entries: undefined, ng_users: c.ng_entries ? [] : c.ng_users };
      }
      if ((c.ng_entries?.length ?? 0) > 0) {
        return { ...c, ng_entries: filtered, ng_users: [] };
      }
      return { ...c, ng_users: filtered.map((e) => e.username ?? '').filter(Boolean) };
    });
    setCasts(nextCasts);
    repository.saveCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  };

  /** 全キャストのNGユーザーをユニーク化した候補リスト */
  const allNgUserCandidates = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/^@/, '');
    const result: { username: string; accountId: string; castNames: string[] }[] = [];
    for (const cast of casts) {
      for (const entry of getNgEntriesFromCast(cast)) {
        const uname = entry.username?.trim() ?? '';
        const aid = entry.accountId?.trim().replace(/^@/, '') ?? '';
        if (!uname && !aid) continue; // 両方空なら無視
        const key = `${norm(uname)}::${norm(aid)}`;
        const existing = result.find((r) => `${norm(r.username)}::${norm(r.accountId)}` === key);
        if (existing) {
          if (!existing.castNames.includes(cast.name)) existing.castNames.push(cast.name);
        } else {
          result.push({ username: uname, accountId: aid, castNames: [cast.name] });
        }
      }
    }
    // 既に要注意に登録済みのユーザーを除外
    const cautionKeys = new Set(
      matchingSettings.caution.cautionUsers.map(
        (c) => `${norm(c.username)}::${norm(c.accountId)}`
      ),
    );
    return result.filter((r) => !cautionKeys.has(`${norm(r.username)}::${norm(r.accountId)}`));
  }, [casts, matchingSettings.caution.cautionUsers]);

  const [cautionSelection, setCautionSelection] = useState<Set<number>>(new Set());

  const handleToggleCautionCandidate = useCallback((index: number) => {
    setCautionSelection((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  const handleAddSelectedCautions = useCallback(() => {
    const now = new Date().toISOString();
    const newEntries: CautionUser[] = [];
    cautionSelection.forEach((idx) => {
      const c = allNgUserCandidates[idx];
      if (c) {
        newEntries.push({
          username: c.username,
          accountId: c.accountId,
          registrationType: 'manual',
          registeredAt: now,
        });
      }
    });
    if (newEntries.length === 0) return;
    setMatchingSettings((prev) => ({
      ...prev,
      caution: {
        ...prev.caution,
        cautionUsers: [...prev.caution.cautionUsers, ...newEntries],
      },
    }));
    setCautionSelection(new Set());
    setShowCautionSelect(false);
  }, [cautionSelection, allNgUserCandidates, setMatchingSettings]);

  const handleRemoveCaution = useCallback(
    (index: number) => {
      setMatchingSettings((prev) => ({
        ...prev,
        caution: {
          ...prev.caution,
          cautionUsers: prev.caution.cautionUsers.filter((_, i) => i !== index),
        },
      }));
    },
    [setMatchingSettings],
  );

  const handleSubmitException = useCallback(
    (values: Record<string, string>) => {
      const newOne: NGException = {
        username: values.username,
        accountId: values.accountId,
        registeredAt: new Date().toISOString(),
      };
      setMatchingSettings((prev) => ({
        ...prev,
        ngExceptions: { exceptions: [...prev.ngExceptions.exceptions, newOne] },
      }));
      setShowExceptionModal(false);
    },
    [setMatchingSettings],
  );

  const handleRemoveException = useCallback(
    (index: number) => {
      setMatchingSettings((prev) => ({
        ...prev,
        ngExceptions: {
          exceptions: prev.ngExceptions.exceptions.filter((_, i) => i !== index),
        },
      }));
    },
    [setMatchingSettings],
  );

  const castNgListByCast = useMemo(() => {
    return casts.map((cast) => {
      const entries = getNgEntriesFromCast(cast);
      const userLabels = entries
        .map((e) =>
          e.username
            ? (e.accountId ? `${e.username} / @${e.accountId}` : e.username)
            : e.accountId ?? ''
        )
        .filter(Boolean);
      return { castName: cast.name, userLabels };
    });
  }, [casts]);

  const cautionWithCasts = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/^@/, '');
    return matchingSettings.caution.cautionUsers.map((c) => {
      const ngCastNames: string[] = [];
      const cName = norm(c.username);
      const cId = norm(c.accountId);
      for (const cast of casts) {
        const entries = getNgEntriesFromCast(cast);
        const matches = entries.some((e) => {
          const eName = norm(e.username ?? '');
          const eId = norm(e.accountId ?? '');
          // 表示用: NG元キャストの紐付けは OR で広めに検索（マッチング判定ではない）
          if (cName && eName && cName === eName) return true;
          if (cId && eId && cId === eId) return true;
          return false;
        });
        if (matches) ngCastNames.push(cast.name);
      }
      return { ...c, ngCastNames };
    });
  }, [casts, matchingSettings.caution.cautionUsers]);

  return (
    <div className="page-wrapper ng-page">
      <div className="ng-page__header">
        <h1 className="page-header-title page-header-title--lg">NGユーザー管理</h1>
        <p className="page-header-subtitle">
          キャストごとに接客しないユーザー（NG）を登録します。判定基準・マッチング挙動・要注意人物・NG例外もここで設定します。
        </p>
      </div>

      {casts.length === 0 ? (
        <div className="ng-page__section">
          <p className="ng-page__empty-note">
            キャストがまだいません。先に「キャスト管理」でキャストを登録してください。
          </p>
        </div>
      ) : (
        <>
          {/* ── NGユーザー登録セクション ── */}
          <div className="ng-page__section">
            <div className="ng-page__section-header">
              <h2 className="ng-page__section-title">NGユーザー登録</h2>
              <p className="ng-page__section-desc">
                キャストを選択し、NGユーザーを追加・確認できます。
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">対象キャスト</label>
              <AppSelect
                value={selectValue}
                onValueChange={setSelectedCastName}
                options={castOptions}
                placeholder="キャストを選択"
              />
            </div>

            <div className="form-group">
              <label className="form-label">NGユーザーを追加</label>
              <p className="form-inline-note ng-page__field-hint">
                ユーザー名は必須です。X ID は任意ですが、入力すると判定精度が上がります。
              </p>
              <div className="ng-page__add-row">
                <input
                  placeholder="ユーザー名（必須）"
                  className="form-input ng-page__add-input ng-page__add-input--name"
                  value={inputNgName}
                  onChange={(e) => setInputNgName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNg()}
                />
                <input
                  placeholder="X ID（任意: @username や x.com URL）"
                  className="form-input ng-page__add-input ng-page__add-input--id"
                  value={inputXId}
                  onChange={(e) => setInputXId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNg()}
                />
                <button onClick={handleAddNg} className="btn-primary btn-fixed-h">
                  追加
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {selectedCastName} のNGユーザー一覧（{ngEntries.length}名）
              </label>
              <div className="ng-list">
                {ngEntries.length > 0 ? (
                  ngEntries.map((entry, idx) => {
                    const label = entry.username
                      ? (entry.accountId ? `${entry.username} / @${entry.accountId}` : entry.username)
                      : entry.accountId ?? '';
                    return (
                      <div key={`${entryToKey(entry)}-${idx}`} className="ng-list__chip">
                        <span>{label}</span>
                        <button
                          type="button"
                          className="ng-list__chip-remove"
                          onClick={() => handleRemoveNg(selectedCastName, entry)}
                          aria-label={`${label} を削除`}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-muted-italic">なし</span>
                )}
              </div>
            </div>
          </div>

          {/* ── キャストごとのNG一覧 ── */}
          <div className="ng-page__section">
            <div className="ng-page__section-header">
              <h2 className="ng-page__section-title">キャスト別 NG一覧</h2>
              <p className="ng-page__section-desc">
                キャストごとにNG登録ユーザーを表示しています。
              </p>
            </div>
            {castNgListByCast.some((r) => r.userLabels.length > 0) ? (
              <div className="ng-cast-summary">
                {castNgListByCast
                  .filter((row) => row.userLabels.length > 0)
                  .map((row) => (
                    <div key={row.castName} className="ng-cast-summary__row">
                      <span className="ng-cast-summary__cast-name">{row.castName}</span>
                      <div className="ng-cast-summary__chips">
                        {row.userLabels.map((label) => (
                          <span key={label} className="ng-list__chip ng-list__chip--readonly">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <span className="text-muted-italic">NG登録がありません。</span>
            )}
          </div>
        </>
      )}

      {/* ── 判定設定セクション ── */}
      <div className="ng-page__section">
        <div className="ng-page__section-header">
          <h2 className="ng-page__section-title">判定設定</h2>
          <p className="ng-page__section-desc">
            キャストごとのNGリストの判定方法と、マッチング時の挙動を選択します。
          </p>
        </div>
        <div className="ng-page__settings-grid">
          <div className="form-group">
            <label className="form-label">判定基準</label>
            <AppSelect
              value={matchingSettings.ngJudgmentType}
              onValueChange={(v) => {
                if (v === 'username' || v === 'accountId' || v === 'either') setMatchingSettings((prev) => ({ ...prev, ngJudgmentType: v }));
              }}
              options={(Object.keys(NG_JUDGMENT_LABELS) as NGJudgmentType[]).map((k) => ({
                value: k,
                label: NG_JUDGMENT_LABELS[k],
              }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">マッチング時の挙動</label>
            <AppSelect
              value={matchingSettings.ngMatchingBehavior}
              onValueChange={(v) => {
                if (v === 'warn' || v === 'exclude') setMatchingSettings((prev) => ({ ...prev, ngMatchingBehavior: v }));
              }}
              options={(Object.keys(NG_BEHAVIOR_LABELS) as NGMatchingBehavior[]).map((k) => ({
                value: k,
                label: NG_BEHAVIOR_LABELS[k],
              }))}
            />
          </div>
        </div>
      </div>

      {/* ── 要注意人物セクション ── */}
      <div className="ng-page__section">
        <div className="ng-page__section-header">
          <h2 className="ng-page__section-title">要注意人物</h2>
          <p className="ng-page__section-desc">
            複数キャストがNGにしたユーザーを自動で要注意にします（判定基準の設定に従います）。手動では既存のNGユーザーから選択して登録できます。
          </p>
        </div>
        <div className="ng-page__caution-controls">
          <div className="form-group ng-page__threshold-group">
            <label className="form-label">自動登録の閾値</label>
            <p className="form-inline-note ng-page__field-hint">何人以上のキャストがNGにしたら要注意とするか</p>
            <input
              type="number"
              min={1}
              value={cautionThreshold}
              onChange={(e) => setCautionThreshold(Number(e.target.value) || 1)}
              onBlur={handleThresholdBlur}
              className="form-input ng-page__threshold-input"
            />
          </div>
          <button
            type="button"
            className="btn-primary btn-fixed-h"
            onClick={() => { setCautionSelection(new Set()); setShowCautionSelect(true); }}
            disabled={allNgUserCandidates.length === 0}
          >
            NGユーザーから登録
          </button>
        </div>
        {cautionWithCasts.length > 0 && (
          <div className="ng-cast-summary__table-wrap">
            <table className="ng-cast-summary__table">
              <thead>
                <tr>
                  <th>ユーザー名</th>
                  <th>アカウントID(X)</th>
                  <th>種別</th>
                  <th>NG登録しているキャスト</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cautionWithCasts.map((c, i) => (
                  <tr key={`${c.username}-${c.accountId}-${i}`}>
                    <td>{c.username}</td>
                    <td>@{c.accountId}</td>
                    <td>
                      <span className={`ng-page__badge ${c.registrationType === 'manual' ? 'ng-page__badge--manual' : 'ng-page__badge--auto'}`}>
                        {c.registrationType === 'manual' ? '手動' : '自動'}
                      </span>
                    </td>
                    <td>{c.ngCastNames.length > 0 ? c.ngCastNames.join('、') : (c.ngCastCount != null ? `${c.ngCastCount}名` : '—')}</td>
                    <td>
                      {c.registrationType === 'manual' && (
                        <button
                          type="button"
                          className="ng-page__remove-btn"
                          onClick={() => handleRemoveCaution(i)}
                        >
                          削除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cautionWithCasts.length === 0 && (
          <span className="text-muted-italic">要注意人物はいません。</span>
        )}
      </div>

      {/* ── NG例外セクション ── */}
      <div className="ng-page__section">
        <div className="ng-page__section-header">
          <h2 className="ng-page__section-title">NG例外</h2>
          <p className="ng-page__section-desc">
            登録したユーザーは応募リストの要注意警告を出しません。キャストのNG設定には影響しません（ユーザー名・アカウントID両方必須）。
          </p>
        </div>
        <div className="ng-page__exception-controls">
          <button type="button" className="btn-primary btn-fixed-h" onClick={() => setShowExceptionModal(true)}>
            NG例外を追加
          </button>
        </div>
        {matchingSettings.ngExceptions.exceptions.length > 0 ? (
          <div className="ng-page__exception-list">
            {matchingSettings.ngExceptions.exceptions.map((e, i) => (
              <div key={`${e.username}-${e.accountId}-${i}`} className="ng-page__exception-chip">
                <span className="ng-page__exception-chip-text">
                  {e.username} <span className="ng-page__exception-chip-id">@{e.accountId}</span>
                </span>
                <button
                  type="button"
                  className="ng-page__exception-chip-remove"
                  onClick={() => handleRemoveException(i)}
                  aria-label={`${e.username} を例外から削除`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-italic">NG例外はありません。</span>
        )}
      </div>

      {alertMessage && (
        <ConfirmModal
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
          confirmLabel="OK"
          type="alert"
        />
      )}

      {showCautionSelect && (
        <ConfirmModal
          title="要注意人物をNGユーザーから選択"
          message=""
          onConfirm={handleAddSelectedCautions}
          onCancel={() => setShowCautionSelect(false)}
          confirmLabel={`${cautionSelection.size}件を登録`}
          cancelLabel="キャンセル"
          type="confirm"
        >
          <p className="form-inline-note" style={{ marginBottom: 12 }}>
            各キャストのNGリストに登録されているユーザーから選択できます。
          </p>
          {allNgUserCandidates.length > 0 ? (
            <div className="ng-select-list">
              {allNgUserCandidates.map((c, i) => (
                <label key={`${c.username}-${c.accountId}-${i}`} className="ng-select-list__item">
                  <input
                    type="checkbox"
                    checked={cautionSelection.has(i)}
                    onChange={() => handleToggleCautionCandidate(i)}
                  />
                  <span className="ng-select-list__info">
                    <span className="ng-select-list__name">
                      {c.username || '(名前なし)'}
                      {c.accountId
                        ? <span className="ng-select-list__id"> @{c.accountId}</span>
                        : <span className="ng-select-list__id ng-select-list__id--missing"> (ID未登録)</span>
                      }
                    </span>
                    <span className="ng-select-list__casts">
                      NG登録: {c.castNames.join('、')}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <span className="text-muted-italic">登録可能なNGユーザーがありません。</span>
          )}
        </ConfirmModal>
      )}

      {showExceptionModal && (
        <InputModal
          title="NG例外を追加"
          description="例外登録するユーザーのユーザー名とアカウントIDを入力してください。"
          fields={[
            { key: 'username', label: 'ユーザー名', placeholder: 'ユーザー名を入力', required: true },
            { key: 'accountId', label: 'アカウントID (X)', placeholder: '@username', required: true },
          ]}
          onSubmit={handleSubmitException}
          onCancel={() => setShowExceptionModal(false)}
          submitLabel="追加"
        />
      )}
    </div>
  );
};
