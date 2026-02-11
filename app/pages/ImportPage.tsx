import React, { useState, useEffect } from 'react';
import { useAppContext } from '../stores/AppContext';
import { BUSINESS_MODE_SPECIAL_LABEL, BUSINESS_MODE_NORMAL } from '../common/copy';
import { STORAGE_KEYS, URL_HISTORY_MAX } from '../common/config';

interface ImportPageProps {
  /**
   * インポート要求ハンドラ
   * - hasSession: LocalStorage に前回セッションがあるかどうか
   */
  onImportRequest: (userUrl: string, castUrl: string, hasSession: boolean) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({ onImportRequest }) => {
  const { businessMode, setBusinessMode, repository } = useAppContext();
  // RepositoryからURLを読み込んで初期値として設定
  const [userUrl, setUserUrl] = useState('');
  const [castUrl, setCastUrl] = useState('');
  const [userUrlHistory, setUserUrlHistory] = useState<string[]>([]);
  const [castUrlHistory, setCastUrlHistory] = useState<string[]>([]);

  // localStorageからURL履歴を読み込む
  useEffect(() => {
    try {
      const savedUserHistory = localStorage.getItem(STORAGE_KEYS.USER_URL_HISTORY);
      const savedCastHistory = localStorage.getItem(STORAGE_KEYS.CAST_URL_HISTORY);
      if (savedUserHistory) {
        const parsed = JSON.parse(savedUserHistory);
        if (Array.isArray(parsed)) {
          setUserUrlHistory(parsed.slice(0, URL_HISTORY_MAX));
        }
      }
      if (savedCastHistory) {
        const parsed = JSON.parse(savedCastHistory);
        if (Array.isArray(parsed)) {
          setCastUrlHistory(parsed.slice(0, URL_HISTORY_MAX));
        }
      }
    } catch (e) {
      console.error('URL履歴の読み込みに失敗:', e);
    }
  }, []);

  // ページ表示時に Repository から URL を読み込む。無い場合は履歴の先頭で入力欄を埋める（リロード後も前回URLを表示）
  useEffect(() => {
    const savedUserUrl = repository.getUserSheetUrl();
    const savedCastUrl = repository.getCastSheetUrl();
    if (savedUserUrl) setUserUrl(savedUserUrl);
    else if (userUrlHistory.length > 0) setUserUrl(userUrlHistory[0]);
    if (savedCastUrl) setCastUrl(savedCastUrl);
    else if (castUrlHistory.length > 0) setCastUrl(castUrlHistory[0]);
  }, [repository, userUrlHistory, castUrlHistory]);

  // URL履歴をlocalStorageに保存する関数
  const saveUrlToHistory = (url: string, type: 'user' | 'cast') => {
    if (!url || !url.trim()) return;
    
    try {
      const key = type === 'user' ? STORAGE_KEYS.USER_URL_HISTORY : STORAGE_KEYS.CAST_URL_HISTORY;
      
      // localStorageから最新の履歴を取得（状態が古い可能性があるため）
      const savedHistory = localStorage.getItem(key);
      const currentHistory = savedHistory ? JSON.parse(savedHistory) : [];
      if (!Array.isArray(currentHistory)) {
        throw new Error('Invalid history format');
      }
      
      // 既存の履歴から重複を除去し、新しいURLを先頭に追加
      const updatedHistory = [
        url.trim(),
        ...currentHistory.filter((u: string) => u && u.trim() !== url.trim())
      ].slice(0, URL_HISTORY_MAX);

      localStorage.setItem(key, JSON.stringify(updatedHistory));
      
      if (type === 'user') {
        setUserUrlHistory(updatedHistory);
      } else {
        setCastUrlHistory(updatedHistory);
      }
    } catch (e) {
      console.error('URL履歴の保存に失敗:', e);
    }
  };

  // 保存ボタンクリック時に履歴に追加 + インポートフロー起動
  const handleSave = () => {
    if (userUrl.trim()) {
      saveUrlToHistory(userUrl, 'user');
    }
    if (castUrl.trim()) {
      saveUrlToHistory(castUrl, 'cast');
    }
    let hasSession = false;
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
        hasSession = !!raw;
      }
    } catch (e) {
      console.error('セッション情報の確認に失敗:', e);
    }
    onImportRequest(userUrl, castUrl, hasSession);
  };

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h2 className="page-header-title page-header-title--md">外部連携設定</h2>
        <p className="page-header-subtitle form-subtitle-mb">
          スプレッドシートのURLを同期します。
        </p>

        <div className="form-group form-group-spacing">
          <label className="form-label">営業モード</label>
          <div className="btn-toggle-group">
            <button
              type="button"
              onClick={() => setBusinessMode('special')}
              className={`btn-toggle ${businessMode === 'special' ? 'active' : ''}`}
            >
              {BUSINESS_MODE_SPECIAL_LABEL}
            </button>
            <button
              type="button"
              onClick={() => setBusinessMode('normal')}
              className={`btn-toggle ${businessMode === 'normal' ? 'active' : ''}`}
            >
              {BUSINESS_MODE_NORMAL}
            </button>
          </div>
          <p className="form-inline-note form-note-mt">
            {businessMode === 'special'
              ? '※ 希望キャストは3つの別項目（E列、F列、G列）から読み込みます'
              : '※ 希望キャストは1項目（E列）のカンマ区切りから読み込みます'}
          </p>
        </div>

        <label className="form-label">応募者名簿 URL</label>
        <input
          type="url"
          list="user-url-list"
          autoComplete="url"
          className="form-input form-input-mb"
          value={userUrl}
          onChange={(e) => setUserUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
        <datalist id="user-url-list">
          {userUrlHistory.map((url, idx) => (
            <option key={idx} value={url} />
          ))}
        </datalist>

        <label className="form-label">キャストリスト URL</label>
        <input
          type="url"
          list="cast-url-list"
          autoComplete="url"
          className="form-input form-input-mb"
          value={castUrl}
          onChange={(e) => setCastUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
        />
        <datalist id="cast-url-list">
          {castUrlHistory.map((url, idx) => (
            <option key={idx} value={url} />
          ))}
        </datalist>

        <button
          className="btn-primary btn-full-width"
          onClick={handleSave}
        >
          データを取り込む
        </button>
      </div>
    </div>
  );
};

