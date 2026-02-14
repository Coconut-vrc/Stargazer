import React, { useState, useEffect, useCallback } from 'react';
import type { CastBean, ContactLink } from '@/common/types/entities';
import { Repository } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CAST_PAGE_NOTICE } from '@/common/copy';
import { parseXUsername, getXProfileUrl, isXUrl, isVrcUrl } from '@/common/xIdUtils';
import { openInDefaultBrowser } from '@/common/openExternal';
import { EXTERNAL_LINK } from '@/common/copy';

type PersistCastsFn = (casts: CastBean[]) => void | Promise<void>;

export const CastManagementPage: React.FC<{
  repository: Repository;
  onPersistCasts?: PersistCastsFn;
}> = ({ repository, onPersistCasts }) => {
  const [casts, setCasts] = useState<CastBean[]>([]);
  const [selectedCastName, setSelectedCastName] = useState('');
  const [inputCastName, setInputCastName] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [loadExternalError, setLoadExternalError] = useState<string | null>(null);
  const [loadExternalLoading, setLoadExternalLoading] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

  useEffect(() => {
    const allCasts = repository.getAllCasts();
    setCasts(allCasts);
    if (allCasts.length > 0 && !selectedCastName) {
      setSelectedCastName(allCasts[0].name);
    }
  }, [repository, selectedCastName]);

  const handleAddCast = () => {
    const newName = inputCastName.trim();
    if (!newName) return;
    if (casts.some(c => c.name === newName)) {
      setAlertMessage('そのキャストは既に登録されています');
      return;
    }

    const newCast: CastBean = {
      name: newName,
      is_present: false,
      ng_users: []
    };

    const updatedList = [...casts, newCast];
    repository.saveCasts(updatedList);
    setCasts(updatedList);
    setInputCastName('');
    if (updatedList.length === 1) setSelectedCastName(newName);
    onPersistCasts?.(updatedList);
  };

  const handleDeleteCast = (castName: string) => {
    const allCasts = repository.getAllCasts();
    if (allCasts.findIndex((c) => c.name === castName) === -1) return;

    setConfirmMessage({
      message: `「${castName}」を削除しますか？`,
      onConfirm: () => {
        setConfirmMessage(null);
        const updated = allCasts.filter((c) => c.name !== castName);
        repository.saveCasts(updated);
        setCasts(updated);
        if (selectedCastName === castName) {
          setSelectedCastName(updated[0]?.name ?? '');
        }
        onPersistCasts?.(updated);
      },
    });
  };

  const togglePresence = (cast: CastBean) => {
    const newStatus = !cast.is_present;
    repository.updateCastPresence(cast.name, newStatus);
    const nextCasts = [...repository.getAllCasts()];
    setCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  };

  const handleUpdateCastField = (castName: string, field: 'x_id' | 'vrc_profile_url', value: string) => {
    const trimmed = value.trim();
    const nextCasts = casts.map((c) =>
      c.name === castName ? { ...c, [field]: trimmed || undefined } : c
    );
    repository.saveCasts(nextCasts);
    setCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  };

  /* ── 自由形式の連絡先 ── */
  const handleAddContact = useCallback((castName: string) => {
    const nextCasts = casts.map((c) => {
      if (c.name !== castName) return c;
      const contacts: ContactLink[] = [...(c.contacts ?? []), { label: '', value: '' }];
      return { ...c, contacts };
    });
    repository.saveCasts(nextCasts);
    setCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  }, [casts, repository, onPersistCasts]);

  const handleUpdateContact = useCallback((castName: string, index: number, field: 'label' | 'value', val: string) => {
    const nextCasts = casts.map((c) => {
      if (c.name !== castName) return c;
      const contacts = [...(c.contacts ?? [])];
      if (!contacts[index]) return c;
      contacts[index] = { ...contacts[index], [field]: val };
      return { ...c, contacts };
    });
    repository.saveCasts(nextCasts);
    setCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  }, [casts, repository, onPersistCasts]);

  const handleRemoveContact = useCallback((castName: string, index: number) => {
    const nextCasts = casts.map((c) => {
      if (c.name !== castName) return c;
      const contacts = (c.contacts ?? []).filter((_, i) => i !== index);
      return { ...c, contacts: contacts.length > 0 ? contacts : undefined };
    });
    repository.saveCasts(nextCasts);
    setCasts(nextCasts);
    onPersistCasts?.(nextCasts);
  }, [casts, repository, onPersistCasts]);

  const handleRequestOpenExternal = (url: string) => {
    if (!url || !url.trim()) return;
    setPendingExternalUrl(url.trim());
  };

  const handleConfirmOpenExternal = async () => {
    if (pendingExternalUrl) {
      await openInDefaultBrowser(pendingExternalUrl);
      setPendingExternalUrl(null);
    }
  };

  /** アプリ外の sample-casts.json を取得して既存キャストにマージする */
  const handleLoadSampleCasts = async () => {
    setLoadExternalError(null);
    setLoadExternalLoading(true);
    try {
      const base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
      const res = await fetch(`${base}/sample-casts.json`);
      if (!res.ok) {
        setLoadExternalError(`読み込みに失敗しました（${res.status}）`);
        return;
      }
      const raw = await res.json();
      if (!Array.isArray(raw)) {
        setLoadExternalError('JSONの形式が不正です（配列である必要があります）');
        return;
      }
      const existingNames = new Set(casts.map((c) => c.name));
      const toAdd: CastBean[] = [];
      for (const item of raw) {
        if (item && typeof item.name === 'string' && item.name.trim() !== '' && !existingNames.has(item.name.trim())) {
          const xId = typeof item.x_id === 'string' ? item.x_id.trim() || undefined : undefined;
          const vrcUrl = typeof item.vrc_profile_url === 'string' ? item.vrc_profile_url.trim() || undefined : undefined;
          const contacts: ContactLink[] | undefined = Array.isArray(item.contacts)
            ? item.contacts
                .filter((ct: unknown) => ct && typeof ct === 'object' && 'label' in (ct as Record<string, unknown>) && 'value' in (ct as Record<string, unknown>))
                .map((ct: { label: string; value: string }) => ({ label: String(ct.label), value: String(ct.value) }))
            : undefined;
          toAdd.push({
            name: item.name.trim(),
            is_present: Boolean(item.is_present),
            ng_users: Array.isArray(item.ng_users) ? item.ng_users : [],
            x_id: xId,
            vrc_profile_url: vrcUrl,
            contacts: contacts && contacts.length > 0 ? contacts : undefined,
          });
          existingNames.add(item.name.trim());
        }
      }
      if (toAdd.length === 0) {
        setLoadExternalError('追加できるキャストがありません（既に登録済みか、有効な名前がありません）');
        return;
      }
      const merged = [...casts, ...toAdd];
      repository.saveCasts(merged);
      setCasts(merged);
      onPersistCasts?.(merged);
      setAlertMessage(`${toAdd.length}件のキャストを追加しました。`);
    } catch (e) {
      const message = e instanceof Error ? e.message : '読み込み中にエラーが発生しました';
      setLoadExternalError(message);
    } finally {
      setLoadExternalLoading(false);
    }
  };

  const presentCount = casts.filter((c) => c.is_present).length;
  const totalCount = casts.length;
  const presentCasts = casts.filter((c) => c.is_present);
  const absentCasts = casts.filter((c) => !c.is_present);

  return (
    <div className="page-wrapper page-wrapper--cast">
      <header className="page-header">
        <div className="page-header-row page-header-row--flex-start">
          <h1 className="page-header-title page-header-title--lg">キャスト管理</h1>
          <div className="status-card">
            <div className="status-card__label">出席状況</div>
            <div className="status-card__value">
              <span className="status-card__value-accent">{presentCount}</span>
              <span className="status-card__value-suffix">/ {totalCount}</span>
            </div>
          </div>
        </div>
      </header>

      <div
        className="cast-page-notice"
        role="alert"
      >
        {CAST_PAGE_NOTICE}
      </div>

      {/* 出席者・欠席者 一覧（一目でわかる枠） */}
      <div className="cast-presence-summary">
        <div className="cast-presence-summary__col cast-presence-summary__col--present">
          <div className="cast-presence-summary__label">出席者 ({presentCasts.length})</div>
          <div className="cast-presence-summary__list">
            {presentCasts.length > 0 ? (
              presentCasts.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="cast-presence-summary__chip cast-presence-summary__chip--present"
                  onClick={() => togglePresence(c)}
                  title="クリックで欠席に切り替え"
                >
                  {c.name}
                </button>
              ))
            ) : (
              <span className="cast-presence-summary__empty">—</span>
            )}
          </div>
        </div>
        <div className="cast-presence-summary__col cast-presence-summary__col--absent">
          <div className="cast-presence-summary__label">欠席者 ({absentCasts.length})</div>
          <div className="cast-presence-summary__list">
            {absentCasts.length > 0 ? (
              absentCasts.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="cast-presence-summary__chip cast-presence-summary__chip--absent"
                  onClick={() => togglePresence(c)}
                  title="クリックで出席に切り替え"
                >
                  {c.name}
                </button>
              ))
            ) : (
              <span className="cast-presence-summary__empty">—</span>
            )}
          </div>
        </div>
      </div>
      <p className="cast-presence-summary__hint">
        名前をタップ／クリックすると出席・欠席を切り替えられます。
      </p>

      <div className="flex-col-gap20">
        {/* キャスト新規登録フォーム */}
        <div className="form-card form-card--flex-row">
          <div className="flex-col-flex1">
            <label className="form-label">キャストを新規登録</label>
            <input
              placeholder="キャスト名を入力..."
              className="form-input"
              value={inputCastName}
              onChange={(e) => setInputCastName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCast()}
            />
          </div>
          <button onClick={handleAddCast} className="btn-success btn-fixed-h">
            登録
          </button>
        </div>


        <p className="form-inline-note text-muted-color mt-4">
          NGユーザーの登録・解除は「NGユーザー管理」で行います。
        </p>
      </div>

      {/* カード一覧表示 */}
      <div className="cast-grid">
        {casts.map((cast) => (
          <div key={cast.name} className="cast-card">
            <div className="cast-card__header">
              <span className="cast-card__name">{cast.name}</span>
              <div
                className={
                  'cast-card__status-dot ' +
                  (cast.is_present ? 'cast-card__status-dot--present' : 'cast-card__status-dot--absent')
                }
              />
            </div>

            <button
              onClick={() => togglePresence(cast)}
              className={
                'cast-card__presence-button ' +
                (cast.is_present
                  ? 'cast-card__presence-button--present'
                  : 'cast-card__presence-button--absent')
              }
            >
              {cast.is_present ? '出席中' : '欠席'}
            </button>

            {/* Lit.Link 風リンク設定 */}
            <div className="litlink">

              {/* 自由形式の連絡先 */}
              {(cast.contacts ?? []).map((contact, ci) => {
                const contactUrl = contact.value.trim();
                const showXIcon = isXUrl(contactUrl);
                const showVrcIcon = isVrcUrl(contactUrl);
                
                return (
                  <div className="litlink__item" key={ci}>
                    <div className="litlink__body litlink__body--dual">
                      <input
                        type="text"
                        placeholder="ID / URL / 連絡先..."
                        className="litlink__input litlink__input--value"
                        value={contact.value}
                        onChange={(e) => handleUpdateContact(cast.name, ci, 'value', e.target.value)}
                      />
                    </div>
                    {contact.value && /^https?:\/\//.test(contact.value.trim()) ? (
                      <button
                        type="button"
                        className="litlink__open"
                        onClick={() => handleRequestOpenExternal(contact.value.trim())}
                        title="リンクを開く"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="litlink__remove"
                      onClick={() => handleRemoveContact(cast.name, ci)}
                      title="この連絡先を削除"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                className="litlink__add"
                onClick={() => handleAddContact(cast.name)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                連絡先を追加
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleDeleteCast(cast.name)}
              className="cast-card__delete-button mt-8"
            >
              キャストを削除
            </button>
          </div>
        ))}
      </div>

      {alertMessage && (
        <ConfirmModal
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
          confirmLabel="OK"
          type="alert"
        />
      )}
      {confirmMessage && (
        <ConfirmModal
          message={confirmMessage.message}
          onConfirm={confirmMessage.onConfirm}
          onCancel={() => setConfirmMessage(null)}
          confirmLabel="OK"
          type="confirm"
        />
      )}
      {pendingExternalUrl && (
        <ConfirmModal
          type="confirm"
          title={EXTERNAL_LINK.MODAL_TITLE}
          message={`${EXTERNAL_LINK.MODAL_MESSAGE}\n\n${pendingExternalUrl}`}
          confirmLabel={EXTERNAL_LINK.CONFIRM_LABEL}
          cancelLabel={EXTERNAL_LINK.CANCEL_LABEL}
          onConfirm={handleConfirmOpenExternal}
          onCancel={() => setPendingExternalUrl(null)}
        />
      )}
    </div>
  );
};