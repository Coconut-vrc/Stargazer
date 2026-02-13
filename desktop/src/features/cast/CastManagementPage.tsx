// pages/CastManagementPage.tsx の全量

import React, { useState, useEffect } from 'react';
import type { CastBean } from '@/common/types/entities';
import { Repository } from '@/stores/AppContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CAST_PAGE_NOTICE } from '@/common/copy';

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
      setAlertMessage('そのキャストは既に登録されてるよ');
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
          toAdd.push({
            name: item.name.trim(),
            is_present: Boolean(item.is_present),
            ng_users: Array.isArray(item.ng_users) ? item.ng_users : [],
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
        style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: 'rgba(240, 178, 50, 0.15)',
          border: '1px solid var(--discord-text-warning, #f0b232)',
          color: 'var(--discord-text-normal)',
          fontSize: '13px',
          lineHeight: 1.6,
        }}
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

        {/* 外部データから読み込み（public/sample-casts.json） */}
        <div className="form-card form-card--flex-col">
          <label className="form-label">外部データから読み込む</label>
          <p className="text-muted" style={{ marginBottom: '12px', fontSize: '13px' }}>
            public/sample-casts.json の内容を読み込み、既存のキャストにマージします。同名は追加されません。
          </p>
          <div className="flex-end" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={handleLoadSampleCasts}
              disabled={loadExternalLoading}
              className="btn-primary btn-fixed-h"
            >
              {loadExternalLoading ? '読み込み中...' : 'サンプルキャスト（10名）を読み込む'}
            </button>
          </div>
          {loadExternalError && (
            <p role="alert" className="text-danger" style={{ marginTop: '8px', fontSize: '13px' }}>
              {loadExternalError}
            </p>
          )}
        </div>

        <p className="form-inline-note" style={{ color: 'var(--discord-text-muted)', marginTop: 4 }}>
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
            <button
              type="button"
              onClick={() => handleDeleteCast(cast.name)}
              className="cast-card__delete-button"
              style={{ marginTop: 8 }}
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
    </div>
  );
};