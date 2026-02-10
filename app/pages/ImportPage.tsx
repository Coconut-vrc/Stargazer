import React, { useState, useEffect } from 'react';
import { useAppContext } from '../stores/AppContext';

interface ImportPageProps {
  onSuccess: (userUrl: string, castUrl: string) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({ onSuccess }) => {
  const { businessMode, setBusinessMode, repository } = useAppContext();
  // RepositoryからURLを読み込んで初期値として設定
  const [userUrl, setUserUrl] = useState('');
  const [castUrl, setCastUrl] = useState('');
  const [userUrlHistory, setUserUrlHistory] = useState<string[]>([]);
  const [castUrlHistory, setCastUrlHistory] = useState<string[]>([]);

  // localStorageからURL履歴を読み込む
  useEffect(() => {
    try {
      const savedUserHistory = localStorage.getItem('chocomelapp_user_url_history');
      const savedCastHistory = localStorage.getItem('chocomelapp_cast_url_history');
      if (savedUserHistory) {
        const parsed = JSON.parse(savedUserHistory);
        if (Array.isArray(parsed)) {
          setUserUrlHistory(parsed.slice(0, 3)); // 最大3件まで
        }
      }
      if (savedCastHistory) {
        const parsed = JSON.parse(savedCastHistory);
        if (Array.isArray(parsed)) {
          setCastUrlHistory(parsed.slice(0, 3)); // 最大3件まで
        }
      }
    } catch (e) {
      console.error('URL履歴の読み込みに失敗:', e);
    }
  }, []);

  // ページ表示時にRepositoryからURLを読み込む
  useEffect(() => {
    const savedUserUrl = repository.getUserSheetUrl();
    const savedCastUrl = repository.getCastSheetUrl();
    if (savedUserUrl) setUserUrl(savedUserUrl);
    if (savedCastUrl) setCastUrl(savedCastUrl);
  }, [repository]);

  // URL履歴をlocalStorageに保存する関数
  const saveUrlToHistory = (url: string, type: 'user' | 'cast') => {
    if (!url || !url.trim()) return;
    
    try {
      const key = type === 'user' ? 'chocomelapp_user_url_history' : 'chocomelapp_cast_url_history';
      
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
      ].slice(0, 10); // 最大10件まで

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

  // 保存ボタンクリック時に履歴に追加
  const handleSave = () => {
    if (userUrl.trim()) {
      saveUrlToHistory(userUrl, 'user');
    }
    if (castUrl.trim()) {
      saveUrlToHistory(castUrl, 'cast');
    }
    onSuccess(userUrl, castUrl);
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
              特殊営業（完全リクイン制）
            </button>
            <button
              type="button"
              onClick={() => setBusinessMode('normal')}
              className={`btn-toggle ${businessMode === 'normal' ? 'active' : ''}`}
            >
              通常営業
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
          保存して同期を開始
        </button>
      </div>
    </div>
  );
};

