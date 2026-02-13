/**
 * デバッグタブ用ページ。
 * LocalAppData 内フォルダ構造の表示・JSON ローカル DB の Oracle 風表示・簡易 SQL 風クエリ・インポートリファレンス解析結果。
 * 本フォルダはビルド時に対象外とする想定。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@/tauri';
import { isTauri } from '@/tauri';
import {
  REQUIRED_ITEMS_ANALYSIS,
  COMMON_ITEMS_ANALYSIS,
  CUSTOM_IMPORT_CAPABILITY,
  FORM_COMPATIBILITY,
  ANALYSIS_META,
} from './importReferenceAnalysis';

interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: DirEntry[];
}

export const DebugPage: React.FC = () => {
  const [folderTree, setFolderTree] = useState<DirEntry | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [dbJson, setDbJson] = useState<{ casts: Record<string, unknown>[] } | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('SELECT * FROM casts');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: unknown[][] } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const loadFolderStructure = useCallback(async () => {
    if (!isTauri()) {
      setFolderError('Tauri 環境でのみ利用できます');
      return;
    }
    try {
      setFolderError(null);
      const tree = await invoke<DirEntry>('list_app_data_structure');
      setFolderTree(tree);
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadDb = useCallback(async () => {
    if (!isTauri()) {
      setDbError('Tauri 環境でのみ利用できます');
      return;
    }
    try {
      setDbError(null);
      const content = await invoke<string>('read_cast_db_json');
      const data = JSON.parse(content) as { casts?: Record<string, unknown>[] };
      setDbJson({ casts: Array.isArray(data.casts) ? data.casts : [] });
    } catch (e) {
      setDbError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadFolderStructure();
    loadDb();
  }, [loadFolderStructure, loadDb]);

  const runQuery = useCallback(() => {
    setQueryError(null);
    setQueryResult(null);
    const trimmed = queryText.trim().toUpperCase();
    if (trimmed === 'SELECT * FROM CASTS' || trimmed === 'SELECT * FROM casts') {
      if (!dbJson) {
        setQueryError('先に DB を読み込んでください');
        return;
      }
      const casts = dbJson.casts;
      const columns = casts.length > 0
        ? Object.keys(casts[0])
        : ['name', 'is_present', 'ng_users'];
      const rows = casts.map((row) => columns.map((col) => row[col] ?? ''));
      setQueryResult({ columns, rows });
      return;
    }
    if (trimmed.startsWith('SELECT * FROM CASTS WHERE ')) {
      const whereClause = queryText.trim().slice('SELECT * FROM casts WHERE '.length);
      if (!dbJson) {
        setQueryError('先に DB を読み込んでください');
        return;
      }
      const filterLower = whereClause.toLowerCase();
      const nameMatch = filterLower.match(/name\s*=\s*'([^']*)'/);
      const filtered = nameMatch
        ? dbJson.casts.filter((r) => String(r.name ?? '').toLowerCase() === nameMatch[1].toLowerCase())
        : dbJson.casts.filter((r) => {
            const name = String(r.name ?? '');
            return name.toLowerCase().includes(whereClause.replace(/'/g, '').toLowerCase());
          });
      const columns = filtered.length > 0 ? Object.keys(filtered[0]) : ['name', 'is_present', 'ng_users'];
      const rows = filtered.map((row) => columns.map((col) => row[col] ?? ''));
      setQueryResult({ columns, rows });
      return;
    }
    setQueryError('対応例: SELECT * FROM casts または SELECT * FROM casts WHERE name = \'名前\'');
  }, [queryText, dbJson]);

  const renderDirEntry = (entry: DirEntry, depth: number) => {
    const marginLeft = depth * 16;
    return (
      <div key={entry.path || entry.name} style={{ marginLeft }}>
        <span style={{ color: entry.is_dir ? 'var(--discord-text-link)' : 'var(--discord-text-normal)' }}>
          {entry.is_dir ? '📁 ' : '📄 '}
          {entry.name}
        </span>
        {entry.is_dir && entry.children && entry.children.length > 0 && (
          <div>
            {entry.children.map((child) => renderDirEntry(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow" style={{ maxWidth: '900px' }}>
        <h1 className="page-header-title page-header-title--lg">デバッグ</h1>
        <p className="page-header-subtitle form-subtitle-mb">
          LocalAppData 内の Stargazer 用フォルダ構造と JSON ローカル DB の確認用です。
        </p>

        <section className="debug-section">
          <h2 className="debug-section__title">フォルダ構造（LocalAppData / CosmoArtsStore 配下）</h2>
          <button type="button" className="btn-primary" onClick={loadFolderStructure}>
            再読み込み
          </button>
          {folderError && <p className="debug-error">{folderError}</p>}
          {folderTree && (
            <div className="debug-tree">
              {renderDirEntry(folderTree, 0)}
            </div>
          )}
        </section>

        <section className="debug-section">
          <h2 className="debug-section__title">DB データ（Oracle 風）</h2>
          <button type="button" className="btn-primary" onClick={loadDb}>
            DB 再読み込み
          </button>
          {dbError && <p className="debug-error">{dbError}</p>}
          {dbJson && (
            <div className="debug-db-table-wrapper">
              <table className="debug-db-table">
                <thead>
                  <tr>
                    <th className="debug-db-table__th">name</th>
                    <th className="debug-db-table__th">is_present</th>
                    <th className="debug-db-table__th">ng_users</th>
                  </tr>
                </thead>
                <tbody>
                  {dbJson.casts.map((row, i) => (
                    <tr key={i}>
                      <td className="debug-db-table__td">{String(row.name ?? '')}</td>
                      <td className="debug-db-table__td">{String(row.is_present ?? '')}</td>
                      <td className="debug-db-table__td">
                        {Array.isArray(row.ng_users) ? (row.ng_users as string[]).join(', ') : String(row.ng_users ?? '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dbJson.casts.length === 0 && (
                <p className="debug-empty">0 rows</p>
              )}
            </div>
          )}
        </section>

        <section className="debug-section">
          <h2 className="debug-section__title">SQL 風クエリ</h2>
          <p className="form-inline-note" style={{ marginBottom: 8 }}>
            例: SELECT * FROM casts / SELECT * FROM casts WHERE name = &apos;キャスト名&apos;
          </p>
          <div className="form-inline-group" style={{ marginBottom: 12 }}>
            <input
              type="text"
              className="form-input"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="SELECT * FROM casts"
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-primary" onClick={runQuery}>
              Run
            </button>
          </div>
          {queryError && <p className="debug-error">{queryError}</p>}
          {queryResult && (
            <div className="debug-db-table-wrapper">
              <table className="debug-db-table">
                <thead>
                  <tr>
                    {queryResult.columns.map((col) => (
                      <th key={col} className="debug-db-table__th">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="debug-db-table__td">
                          {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="debug-section">
          <h2 className="debug-section__title">インポートファイルリファレンス解析結果</h2>
          <p className="form-inline-note" style={{ marginBottom: 12 }}>
            出典: {ANALYSIS_META.sourceDoc}（{ANALYSIS_META.sourceTitle}）。フォームの中身はドキュメント記載の質問項目から判定。リンク先の実CSVは未取得。
          </p>
          <p className="form-inline-note" style={{ marginBottom: 16 }}>
            {ANALYSIS_META.note}
          </p>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--discord-text-header)' }}>
            必須項目の対応（リファレンス共通必須 vs Stargazer）
          </h3>
          <p style={{ fontSize: 12, color: 'var(--discord-text-muted)', marginBottom: 8 }}>
            Stargazer の必須ルール: {REQUIRED_ITEMS_ANALYSIS.stargazerRequiredRule}
          </p>
          <div className="debug-db-table-wrapper" style={{ marginBottom: 16 }}>
            <table className="debug-db-table">
              <thead>
                <tr>
                  <th className="debug-db-table__th">リファレンス必須項目</th>
                  <th className="debug-db-table__th">Stargazer のフィールド</th>
                  <th className="debug-db-table__th">対応</th>
                  <th className="debug-db-table__th">備考</th>
                </tr>
              </thead>
              <tbody>
                {REQUIRED_ITEMS_ANALYSIS.stargazerSupport.map((row, i) => (
                  <tr key={i}>
                    <td className="debug-db-table__td">{row.ref}</td>
                    <td className="debug-db-table__td">{row.field}</td>
                    <td className="debug-db-table__td">{row.supported ? '○' : '×'}</td>
                    <td className="debug-db-table__td" style={{ fontSize: 11 }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--discord-text-header)' }}>
            よく見られる項目の対応
          </h3>
          <div className="debug-db-table-wrapper" style={{ marginBottom: 16 }}>
            <table className="debug-db-table">
              <thead>
                <tr>
                  <th className="debug-db-table__th">項目</th>
                  <th className="debug-db-table__th">Stargazer フィールド</th>
                  <th className="debug-db-table__th">備考</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(COMMON_ITEMS_ANALYSIS).map(([key, row]) => (
                  <tr key={key}>
                    <td className="debug-db-table__td">{row.ref}</td>
                    <td className="debug-db-table__td">{row.field}</td>
                    <td className="debug-db-table__td" style={{ fontSize: 11 }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--discord-text-header)' }}>
            基本テンプレート項目の有無（各イベント）
          </h3>
          <p style={{ fontSize: 12, color: 'var(--discord-text-muted)', marginBottom: 8 }}>
            ユーザー名とVRCアカウント名は同一とみなして判定。○＝ドキュメントに該当項目あり、×＝なし、－＝記載なしで不明。
          </p>
          <div className="debug-db-table-wrapper" style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table className="debug-db-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th className="debug-db-table__th">イベント名</th>
                  <th className="debug-db-table__th">カテゴリ</th>
                  <th className="debug-db-table__th">ユーザー名（VRCネーム）</th>
                  <th className="debug-db-table__th">X アカウントID</th>
                  <th className="debug-db-table__th">希望キャスト欄1</th>
                  <th className="debug-db-table__th">希望キャスト欄2</th>
                  <th className="debug-db-table__th">希望キャスト欄3</th>
                </tr>
              </thead>
              <tbody>
                {FORM_COMPATIBILITY.map((row, i) => {
                  const items = row.basicTemplateItems;
                  const cell = (value: boolean | null) => (value === true ? '○' : value === false ? '×' : '－');
                  return (
                    <tr key={i}>
                      <td className="debug-db-table__td" style={{ whiteSpace: 'nowrap' }}>{row.name}</td>
                      <td className="debug-db-table__td">{row.category}</td>
                      <td className="debug-db-table__td">{items ? cell(items.userName) : '－'}</td>
                      <td className="debug-db-table__td">{items ? cell(items.xAccount) : '－'}</td>
                      <td className="debug-db-table__td">{items ? cell(items.castHope1) : '－'}</td>
                      <td className="debug-db-table__td">{items ? cell(items.castHope2) : '－'}</td>
                      <td className="debug-db-table__td">{items ? cell(items.castHope3) : '－'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--discord-text-header)' }}>
            カスタムインポートで対応できること
          </h3>
          <ul style={{ fontSize: 12, color: 'var(--discord-text-normal)', marginBottom: 8, paddingLeft: 20 }}>
            {CUSTOM_IMPORT_CAPABILITY.supported.map((s, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{s}</li>
            ))}
          </ul>
          <p style={{ fontSize: 11, color: 'var(--discord-text-muted)', marginBottom: 16 }}>
            制約: {CUSTOM_IMPORT_CAPABILITY.limitation}
          </p>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--discord-text-header)' }}>
            フォーム別対応表（ドキュメント記載の質問項目から判定）
          </h3>
          <div className="debug-db-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="debug-db-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th className="debug-db-table__th">フォーム名</th>
                  <th className="debug-db-table__th">カテゴリ</th>
                  <th className="debug-db-table__th">記載の質問項目</th>
                  <th className="debug-db-table__th">基本テンプレート</th>
                  <th className="debug-db-table__th">カスタム</th>
                  <th className="debug-db-table__th">備考</th>
                </tr>
              </thead>
              <tbody>
                {FORM_COMPATIBILITY.map((row, i) => (
                  <tr key={i}>
                    <td className="debug-db-table__td" style={{ whiteSpace: 'nowrap' }}>{row.name}</td>
                    <td className="debug-db-table__td">{row.category}</td>
                    <td className="debug-db-table__td" style={{ fontSize: 11, maxWidth: 180 }}>{row.docItems}</td>
                    <td className="debug-db-table__td">{row.basicTemplate}</td>
                    <td className="debug-db-table__td">{row.customImport}</td>
                    <td className="debug-db-table__td" style={{ fontSize: 11 }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
