// pages/CastManagementPage.tsx の全量

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CastBean } from '../common/types/entities';
import { Repository } from '../stores/AppContext';
import { SheetService } from '../infrastructures/googleSheets/sheet_service';
import { ConfirmModal } from '../components/ConfirmModal';

export const CastManagementPage: React.FC<{ repository: Repository }> = ({ repository }) => {
  const [casts, setCasts] = useState<CastBean[]>([]);
  const [selectedCastName, setSelectedCastName] = useState('');
  const [inputNgName, setInputNgName] = useState('');
  const [inputCastName, setInputCastName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const sheetService = new SheetService();
  const FALLBACK_CAST_SHEET_URL =
    'https://docs.google.com/spreadsheets/d/1rc_QdWi805TaZ_2e8uV_odpc4DRQNVnC5ET6W63LzPw/edit';

  /** 出席・欠席のシート書き込みをまとめる遅延（ms） */
  const PRESENCE_DEBOUNCE_MS = 600;
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const pendingPresenceRef = useRef<Map<string, string>>(new Map());
  const presenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const allCasts = repository.getAllCasts();
    setCasts(allCasts);
    if (allCasts.length > 0 && !selectedCastName) {
      setSelectedCastName(allCasts[0].name);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [repository, selectedCastName]);

  const syncToSheet = async (castName: string, column: string, value: string) => {
    const castSheetUrl = repository.getCastSheetUrl() || FALLBACK_CAST_SHEET_URL;
    const allCasts = repository.getAllCasts();
    const rowIndex = allCasts.findIndex(c => c.name === castName);
    if (rowIndex === -1) return;

    const range = `${column}${rowIndex + 2}`;
    try {
      await sheetService.updateSheetData(castSheetUrl, range, [[value]]);
    } catch (e) {
      console.error('更新失敗:', e);
    }
  };

  const handleAddCast = async () => {
    const newName = inputCastName.trim();
    if (!newName) return;
    if (casts.some(c => c.name === newName)) {
      setAlertMessage('そのキャストは既に登録されてるよ');
      return;
    }

    const castSheetUrl = repository.getCastSheetUrl();
    if (!castSheetUrl) {
      setAlertMessage('キャストリストのURLが設定されていません。データ読取ページで「キャストリスト URL」を保存してから追加してください。');
      return;
    }

    const newCast: CastBean = {
      name: newName,
      is_present: false,
      ng_users: []
    };

    const nextRowIndex = casts.length + 2;
    const range = `A${nextRowIndex}:C${nextRowIndex}`;

    try {
      await sheetService.updateSheetData(castSheetUrl, range, [[newName, '0', '']]);
      const updatedList = [...casts, newCast];
      repository.saveCasts(updatedList);
      setCasts(updatedList);
      setInputCastName('');
      if (updatedList.length === 1) setSelectedCastName(newName);
    } catch (e) {
      console.error('キャスト追加失敗:', e);
      setAlertMessage('スプレッドシートへの書き込みに失敗しました。URLと共有設定（編集権限）を確認してください。');
    }
  };
  const handleDeleteCast = async (castName: string) => {
    const allCasts = repository.getAllCasts();
    const rowIndex = allCasts.findIndex((c) => c.name === castName);
    if (rowIndex === -1) return;

    setConfirmMessage({
      message: `「${castName}」を削除しますか？`,
      onConfirm: async () => {
        setConfirmMessage(null);
        const castSheetUrl = repository.getCastSheetUrl() || FALLBACK_CAST_SHEET_URL;
        const range = `A${rowIndex + 2}:C${rowIndex + 2}`;

        try {
          await sheetService.updateSheetData(castSheetUrl, range, [['', '', '']]);
          const updated = allCasts.filter((c) => c.name !== castName);
          repository.saveCasts(updated);
          setCasts(updated);
          if (selectedCastName === castName) {
            setSelectedCastName(updated[0]?.name ?? '');
          }
        } catch (e) {
          console.error('キャスト削除失敗:', e);
          setAlertMessage('キャストの削除に失敗しました');
        }
      },
    });
  };

  const handleAddNg = async () => {
    const nameToAdd = inputNgName.trim();
    if (!nameToAdd || !selectedCastName) return;

    const cast = casts.find(c => c.name === selectedCastName);
    if (cast) {
      if (cast.ng_users.includes(nameToAdd)) return;
      const newList = [...cast.ng_users, nameToAdd];
      cast.ng_users = newList;
      setCasts([...casts]);
      setInputNgName('');
      await syncToSheet(selectedCastName, 'C', newList.join(', '));
    }
  };

  const handleRemoveNg = async (castName: string, targetNg: string) => {
    const cast = casts.find((c: CastBean) => c.name === castName);
    if (cast) {
      const newList = cast.ng_users.filter((u: string) => u !== targetNg);
      cast.ng_users = newList;
      setCasts([...casts]);
      await syncToSheet(castName, 'C', newList.join(', '));
    }
  };

  const flushPendingPresence = useCallback(() => {
    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current);
      presenceTimeoutRef.current = null;
    }
    const map = pendingPresenceRef.current;
    pendingPresenceRef.current = new Map();
    if (map.size > 0) {
      const promises = Array.from(map.entries(), ([castName, value]) => syncToSheet(castName, 'B', value));
      Promise.all(promises).finally(() => setHasPendingSync(false));
    } else {
      setHasPendingSync(false);
    }
  }, []);

  const togglePresence = useCallback((cast: CastBean) => {
    const newStatus = !cast.is_present;
    repository.updateCastPresence(cast.name, newStatus);
    setCasts([...repository.getAllCasts()]);
    const sheetValue = newStatus ? '1' : '0';
    pendingPresenceRef.current.set(cast.name, sheetValue);
    setHasPendingSync(true);
    if (presenceTimeoutRef.current) clearTimeout(presenceTimeoutRef.current);
    presenceTimeoutRef.current = setTimeout(flushPendingPresence, PRESENCE_DEBOUNCE_MS);
  }, [repository, flushPendingPresence]);

  // アンマウント時に未送信があれば送信
  useEffect(() => () => {
    const map = pendingPresenceRef.current;
    if (map.size > 0) {
      map.forEach((value, castName) => {
        syncToSheet(castName, 'B', value).catch(() => {});
      });
    }
  }, []);

  const presentCount = casts.filter((c) => c.is_present).length;
  const totalCount = casts.length;
  const presentCasts = casts.filter((c) => c.is_present);
  const absentCasts = casts.filter((c) => !c.is_present);

  return (
    <div className="page-wrapper page-wrapper--cast">
      {/* トースト通知（保存の反映待ち）。常にDOMに置き表示だけ切り替えてがたつきを防ぐ */}
      <div
        className="toast-notification toast-notification--warning"
        aria-hidden={!hasPendingSync}
        style={{
          visibility: hasPendingSync ? 'visible' : 'hidden',
          opacity: hasPendingSync ? 1 : 0,
          pointerEvents: hasPendingSync ? 'auto' : 'none',
        }}
      >
        <div className="toast-notification__content">
          <span className="toast-notification__icon">★</span>
          <span className="toast-notification__message">
            保存の反映待ちです。このまま画面を離れるとスプレッドシートに反映されない場合があります。
          </span>
        </div>
      </div>
      <header className="page-header">
        <div className="page-header-row page-header-row--flex-start">
          <h1 className="page-header-title page-header-title--lg">キャスト・NG管理</h1>
          <div className="status-card">
            <div className="status-card__label">出席状況</div>
            <div className="status-card__value">
              <span className="status-card__value-accent">{presentCount}</span>
              <span className="status-card__value-suffix">/ {totalCount}</span>
            </div>
          </div>
        </div>
      </header>

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

        {/* NGユーザー登録フォーム */}
        <div className="form-card form-card--flex-col form-card--z">
          <div className="dropdown dropdown-inner" ref={dropdownRef}>
            <label className="form-label">対象キャスト</label>
            <div
              className="form-input dropdown-toggle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>{selectedCastName || '選択中...'}</span>
              <span className="dropdown-arrow">▼</span>
            </div>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                {casts.map(c => (
                  <div
                    key={c.name}
                    className="dropdown-item"
                    onClick={() => {
                      setSelectedCastName(c.name);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-col-flex2">
            <label className="form-label">NGユーザーを追加</label>
            <input
              placeholder="ユーザー名を入力..."
              className="form-input"
              value={inputNgName}
              onChange={(e) => setInputNgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddNg()}
            />
          </div>

          <div className="flex-end">
            <button onClick={handleAddNg} className="btn-primary btn-fixed-h btn-fixed-h--sm">
              追加
            </button>
          </div>
        </div>
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
            <div className="cast-card__ng-header">
              <div className="cast-card__ng-label">NGユーザー ({cast.ng_users.length})</div>
              <button
                type="button"
                onClick={() => handleDeleteCast(cast.name)}
                className="cast-card__delete-button"
              >
                削除
              </button>
            </div>

            <div className="cast-card__ng-list">
              {cast.ng_users.length > 0 ? (
                cast.ng_users.map((ng: string) => (
                  <div key={ng} className="cast-card__ng-chip">
                    <span>{ng}</span>
                    <span
                      className="cast-card__ng-chip-remove"
                      onClick={() => handleRemoveNg(cast.name, ng)}
                    >
                      ×
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-muted-italic">なし</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {alertMessage && (
        <ConfirmModal
          message={alertMessage}
          onConfirm={() => setAlertMessage(null)}
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