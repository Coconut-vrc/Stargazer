'use client';

import React, { useState } from 'react';
import { useAppContext } from '../stores/AppContext';
import { BUSINESS_MODE_SPECIAL_LABEL, BUSINESS_MODE_NORMAL } from '../common/copy';
import { parseCSV } from '../common/csvParse';

/** 応募データCSVのヘッダー行数（スキップする） */
const USER_CSV_HEADER_ROWS = 3;
/** キャストCSVのヘッダー行数（1行目のみスキップ） */
const CAST_CSV_HEADER_ROWS = 1;

interface ImportPageProps {
  /** 応募データ行（ヘッダー除く）で取り込み */
  onImportUserRows: (rows: string[][]) => void;
  /** キャストデータ行（ヘッダー除く）で取り込み。省略時はキャストを更新しない */
  onImportCastRows?: (rows: string[][]) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({ onImportUserRows, onImportCastRows }) => {
  const { businessMode, setBusinessMode } = useAppContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFile, setUserFile] = useState<File | null>(null);
  const [castFile, setCastFile] = useState<File | null>(null);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleImport = async () => {
    setError('');
    if (!userFile) {
      setError('応募データCSVを選択してください。');
      return;
    }
    setLoading(true);
    try {
      const userText = await readFileAsText(userFile);
      const userRows = parseCSV(userText);
      if (userRows.length <= USER_CSV_HEADER_ROWS) {
        setError('応募データにデータ行がありません。');
        setLoading(false);
        return;
      }
      const userDataRows = userRows.slice(USER_CSV_HEADER_ROWS);
      onImportUserRows(userDataRows);

      if (onImportCastRows && castFile) {
        const castText = await readFileAsText(castFile);
        const castRows = parseCSV(castText);
        const castDataRows = castRows.length > CAST_CSV_HEADER_ROWS ? castRows.slice(CAST_CSV_HEADER_ROWS) : [];
        onImportCastRows(castDataRows);
      }

      setUserFile(null);
      setCastFile(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ファイルの読み込みに失敗しました。';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h2 className="page-header-title page-header-title--md">データ読取</h2>
        <p className="page-header-subtitle form-subtitle-mb">
          応募データ・キャストをCSVファイルで取り込みます。URLは使いません。
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

        <label className="form-label">応募データCSV（必須）</label>
        <p className="form-inline-note form-note-mt" style={{ marginBottom: 8 }}>
          フォームの回答CSVを選択してください。先頭3行はヘッダーとしてスキップされます。
        </p>
        <input
          type="file"
          accept=".csv"
          className="form-input form-input-mb"
          onChange={(e) => setUserFile(e.target.files?.[0] ?? null)}
        />

        <label className="form-label">キャストCSV（任意）</label>
        <p className="form-inline-note form-note-mt" style={{ marginBottom: 8 }}>
          キャストリストCSV（1行目ヘッダー「キャストリスト,欠勤フラグ,NGユーザー」）。省略時はキャストを更新しません。
        </p>
        <input
          type="file"
          accept=".csv"
          className="form-input form-input-mb"
          onChange={(e) => setCastFile(e.target.files?.[0] ?? null)}
        />

        <button
          className="btn-primary btn-full-width"
          onClick={handleImport}
          disabled={loading}
        >
          {loading ? '読み込み中...' : '取り込む'}
        </button>
        {error && (
          <p style={{ marginTop: 12, color: 'var(--discord-accent-red)', fontSize: 14 }}>{error}</p>
        )}
      </div>
    </div>
  );
};
