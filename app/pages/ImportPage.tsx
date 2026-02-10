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

  // ページ表示時にRepositoryからURLを読み込む
  useEffect(() => {
    const savedUserUrl = repository.getUserSheetUrl();
    const savedCastUrl = repository.getCastSheetUrl();
    if (savedUserUrl) setUserUrl(savedUserUrl);
    if (savedCastUrl) setCastUrl(savedCastUrl);
  }, [repository]);

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--discord-bg-dark)',
    borderRadius: '8px',
    padding: '24px 32px',
    maxWidth: '600px',
    margin: '24px auto',
    border: '1px solid var(--discord-border)',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--discord-text-muted)',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    marginBottom: '8px',
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--discord-bg-dark)',
    border: '1px solid var(--discord-border)',
    padding: '10px 12px',
    borderRadius: '4px',
    color: 'var(--discord-text-normal)',
    fontSize: '16px',
    marginBottom: '20px',
    outline: 'none',
  };

  return (
    <div className="page-wrapper">
      <div style={cardStyle}>
        <h2 className="page-header-title page-header-title--md">外部連携設定</h2>
        <p
          className="page-header-subtitle"
          style={{ fontSize: '14px', marginBottom: '24px' }}
        >
          スプレッドシートのURLを同期します。
        </p>

        <div className="form-group" style={{ marginBottom: '20px' }}>
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
          <p className="form-inline-note" style={{ marginTop: '8px' }}>
            {businessMode === 'special'
              ? '※ 希望キャストは3つの別項目（E列、F列、G列）から読み込みます'
              : '※ 希望キャストは1項目（E列）のカンマ区切りから読み込みます'}
          </p>
        </div>

        <label style={labelStyle}>応募者名簿 URL</label>
        <input style={inputStyle} value={userUrl} onChange={(e) => setUserUrl(e.target.value)} />

        <label style={labelStyle}>キャストリスト URL</label>
        <input style={inputStyle} value={castUrl} onChange={(e) => setCastUrl(e.target.value)} />

        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => onSuccess(userUrl, castUrl)}
        >
          保存して同期を開始
        </button>
      </div>
    </div>
  );
};

