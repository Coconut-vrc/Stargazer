import React, { useState, useMemo } from 'react';
import {
  IMPORT_STYLE,
  IMPORT_COLUMN_LABELS,
  STUB_IMPORT_BASIC_PATH,
  STUB_IMPORT_CHECKBOX_PATH,
  TEST_CSV_PATHS,
} from '@/common/copy';
import { isTauri } from '@/tauri';
import { parseCSV } from '@/common/csvParse';
import {
  type ColumnMapping,
  type ImportStyle,
  type ImportTemplate,
  IMPORT_TEMPLATES,
  TEMPLATE_BASIC,
  createEmptyColumnMapping,
  getMinColumnsFromMapping,
  hasRequiredIdentityColumn,
  CUSTOM_PRESET_VRC,
} from '@/common/importFormat';
import type { MapRowOptions } from '@/common/sheetParsers';

interface ImportPageProps {
  onImportUserRows: (
    rows: string[][],
    mapping: ColumnMapping,
    options?: MapRowOptions
  ) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({ onImportUserRows }) => {
  const [importStyle, setImportStyle] = useState<ImportStyle>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('basic');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customRows, setCustomRows] = useState<string[][] | null>(null);
  const [customMapping, setCustomMapping] = useState<ColumnMapping>(() =>
    createEmptyColumnMapping()
  );
  /** カスタム時: この列をカンマ区切りで希望1・2・3に分割して使う（-1=使わない） */
  const [splitCommaColumnIndex, setSplitCommaColumnIndex] = useState<number>(-1);

  const currentTemplate: ImportTemplate =
    IMPORT_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? TEMPLATE_BASIC;

  /** カスタムで読み込んだデータのうち、3つ以上カンマを含むセルがある列のインデックス */
  const columnsWithMultipleCommas = useMemo(() => {
    if (!customRows || customRows.length === 0) return [];
    const maxCol = Math.max(0, ...customRows.map((r) => r.length));
    const result: number[] = [];
    for (let col = 0; col < maxCol; col++) {
      const hasThreeOrMore = customRows.some((row) => {
        const cell = (row[col] ?? '').toString().trim();
        const commaCount = (cell.match(/,/g) || []).length;
        return commaCount >= 2;
      });
      if (hasThreeOrMore) result.push(col);
    }
    return result;
  }, [customRows]);

  const handleSelectFile = async () => {
    setError('');
    if (!isTauri()) {
      setError(
        'CSVの取り込みはデスクトップアプリで利用できます。npm run tauri:dev で起動してください。'
      );
      return;
    }
    setLoading(true);
    setCustomRows(null);
    setSplitCommaColumnIndex(-1);
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await open({
        title: '応募データCSVを選択',
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (selectedPath === null) {
        setLoading(false);
        return;
      }
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const content = await readTextFile(selectedPath);
      const rows = parseCSV(content);
      const headerRows = importStyle === 'template' ? currentTemplate.headerRows : 1;
      if (rows.length <= headerRows) {
        setError('データ行がありません。');
        setLoading(false);
        return;
      }
      const dataRows = rows.slice(headerRows) as string[][];

      if (importStyle === 'template') {
        const minCols = currentTemplate.minColumns;
        const shortRows = dataRows
          .map((row, i) => ({ rowIndex: i + 1, len: row.length }))
          .filter(({ len }) => len > 0 && len < minCols);
        if (shortRows.length > 0) {
          const sample =
            shortRows.length > 5
              ? `行 ${shortRows.slice(0, 5).map((r) => r.rowIndex).join(', ')} 他${shortRows.length}行`
              : `行 ${shortRows.map((r) => r.rowIndex).join(', ')}`;
          setError(
            `列数が足りません。${currentTemplate.name}では${minCols}列以上必要です。不足している行: ${sample}`
          );
          setLoading(false);
          return;
        }
        onImportUserRows(dataRows, currentTemplate.mapping);
      } else {
        setCustomRows(dataRows);
        const maxCol = Math.max(0, ...dataRows.map((r) => r.length)) - 1;
        setCustomMapping((prev) => {
          const next = { ...prev };
          const clamp = (v: number) => (v <= maxCol ? v : 0);
          const clampOrMinus = (v: number) => (v <= maxCol ? v : -1);
          next.name = next.name >= 0 ? clamp(next.name) : -1;
          next.x_id = next.x_id >= 0 ? clamp(next.x_id) : -1;
          next.cast1 = next.cast1 >= 0 ? clamp(next.cast1) : -1;
          next.cast2 = clampOrMinus(next.cast2 ?? -1);
          next.cast3 = clampOrMinus(next.cast3 ?? -1);
          next.note = next.note >= 0 ? clamp(next.note) : -1;
          next.timestamp = next.timestamp >= 0 ? clamp(next.timestamp) : -1;
          next.first_flag = next.first_flag >= 0 ? clamp(next.first_flag) : -1;
          next.is_pair_ticket = next.is_pair_ticket >= 0 ? clamp(next.is_pair_ticket) : -1;
          return next;
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'ファイルの読み込みに失敗しました。';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyVrcPreset = () => {
    setCustomMapping({ ...CUSTOM_PRESET_VRC });
    if (columnsWithMultipleCommas.includes(3)) setSplitCommaColumnIndex(3);
    else setSplitCommaColumnIndex(-1);
  };

  const handleCustomImport = () => {
    if (!customRows || customRows.length === 0) return;
    setError('');
    if (!hasRequiredIdentityColumn(customMapping)) {
      setError('ユーザー名・アカウントIDのどちらかは必ず列を指定してください。');
      return;
    }
    const minCols = getMinColumnsFromMapping(customMapping);
    const maxIndex = minCols - 1;
    const shortRows = customRows
      .map((row, i) => ({ rowIndex: i + 1, len: row.length }))
      .filter(({ len }) => len <= maxIndex && maxIndex >= 0);
    if (shortRows.length > 0) {
      const sample =
        shortRows.length > 5
          ? `行 ${shortRows.slice(0, 5).map((r) => r.rowIndex).join(', ')} 他${shortRows.length}行`
          : `行 ${shortRows.map((r) => r.rowIndex).join(', ')}`;
      setError(`列数が足りない行があります: ${sample}`);
      return;
    }
    const options: MapRowOptions | undefined =
      splitCommaColumnIndex >= 0
        ? { splitCommaColumnIndex }
        : undefined;
    onImportUserRows(customRows, customMapping, options);
  };

  const maxColIndex = customRows
    ? Math.max(0, ...customRows.map((r) => r.length)) - 1
    : 0;
  const columnOptions = Array.from({ length: maxColIndex + 1 }, (_, i) => ({
    value: i,
    label: `列${i + 1}`,
  }));

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h2 className="page-header-title page-header-title--md">データ読取</h2>
        <p className="page-header-subtitle form-subtitle-mb">
          応募データ（CSV）をファイルで取り込みます。基本テンプレートか、ファイルに合わせたカスタム形式を選べます。
        </p>

        <div className="form-group form-group-spacing">
          <label className="form-label">インポート形式</label>
          <div className="btn-toggle-group">
            <button
              type="button"
              onClick={() => setImportStyle('template')}
              className={`btn-toggle ${importStyle === 'template' ? 'active' : ''}`}
            >
              {IMPORT_STYLE.TEMPLATE}
            </button>
            <button
              type="button"
              onClick={() => setImportStyle('custom')}
              className={`btn-toggle ${importStyle === 'custom' ? 'active' : ''}`}
            >
              {IMPORT_STYLE.CUSTOM}
            </button>
          </div>
        </div>

        {importStyle === 'template' && (
          <div className="form-group form-group-spacing">
            <label className="form-label">テンプレート</label>
            <div className="btn-toggle-group" style={{ flexWrap: 'wrap' }}>
              {IMPORT_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`btn-toggle ${selectedTemplateId === t.id ? 'active' : ''}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="form-inline-note form-note-mt">
              ※ ユーザー名・アカウントIDのどちらかは必須。希望キャストはオプションです。
            </p>
          </div>
        )}

        <label className="form-label">応募データCSV</label>
        <p className="form-inline-note form-note-mt" style={{ marginBottom: 8 }}>
          {importStyle === 'template'
            ? 'テンプレートに沿ったCSVを選択してください。'
            : 'CSVを選択後、列の割り当てとカンマ区切り分割の有無を指定できます。'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="btn-primary btn-full-width"
            onClick={handleSelectFile}
            disabled={loading}
          >
            {loading ? '読み込み中...' : 'CSVファイルを選択'}
          </button>
          <p className="form-inline-note" style={{ margin: 0 }}>
            スタブ:{' '}
            <a href={STUB_IMPORT_BASIC_PATH} download="stub-import-basic.csv">
              基本（200名）
            </a>
            {' / '}
            <a href={STUB_IMPORT_CHECKBOX_PATH} download="stub-import-checkbox.csv">
              カンマ区切り（200名）
            </a>
          </p>
          <p className="form-inline-note" style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
            テスト:{' '}
            <a href={TEST_CSV_PATHS.ng} download="test-200-ng.csv">
              NG検証（200名）
            </a>
            {' / '}
            <a href={TEST_CSV_PATHS.group10x20} download="test-200-group-10x20.csv">
              M005-10×20
            </a>
            {' / '}
            <a href={TEST_CSV_PATHS.group6x20} download="test-120-group-6x20.csv">
              M005-6×20
            </a>
            {' / '}
            <a href={TEST_CSV_PATHS.multiple5x3} download="test-200-multiple-5x3.csv">
              M006-5×3
            </a>
            {' / '}
            <a href={TEST_CSV_PATHS.multiple4x3} download="test-60-multiple-4x3.csv">
              M006-4×3
            </a>
          </p>
        </div>

        {importStyle === 'custom' && customRows !== null && customRows.length > 0 && (
          <div className="form-group form-group-spacing" style={{ marginTop: 24 }}>
            <label className="form-label">列の割り当て</label>
            <p className="form-inline-note form-note-mt" style={{ marginBottom: 8 }}>
              {customRows.length} 行読み込みました。ユーザー名・アカウントIDのどちらかは必須です。
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleApplyVrcPreset}
              style={{ marginBottom: 12 }}
            >
              VRCパターン（ツイッター名・アカウントID・希望キャスト等）を適用
            </button>
            {columnsWithMultipleCommas.length > 0 && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>
                  カンマ区切りが3つ以上ある列を希望1・2・3に分割して使う
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {columnsWithMultipleCommas.map((col) => (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="radio"
                        name="splitComma"
                        checked={splitCommaColumnIndex === col}
                        onChange={() =>
                          setSplitCommaColumnIndex(splitCommaColumnIndex === col ? -1 : col)
                        }
                      />
                      列{col + 1}を分割する
                    </label>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="radio"
                      name="splitComma"
                      checked={splitCommaColumnIndex < 0}
                      onChange={() => setSplitCommaColumnIndex(-1)}
                    />
                    分割しない
                  </label>
                </div>
              </div>
            )}
            <div className="import-column-mapping">
              {(
                [
                  'name',
                  'x_id',
                  'cast1',
                  'cast2',
                  'cast3',
                  'timestamp',
                  'first_flag',
                  'note',
                  'is_pair_ticket',
                ] as const
              ).map((field) => (
                <div key={field} className="import-column-mapping__row">
                  <label className="import-column-mapping__label">
                    {IMPORT_COLUMN_LABELS[field]}
                  </label>
                  <select
                    className="import-column-mapping__select"
                    value={
                      customMapping[field] < 0
                        ? ''
                        : customMapping[field]
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      const num = v === '' ? -1 : parseInt(v, 10);
                      setCustomMapping((prev) => ({ ...prev, [field]: num }));
                    }}
                  >
                    <option value="">使わない</option>
                    {columnOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-primary btn-full-width"
              onClick={handleCustomImport}
              style={{ marginTop: 16 }}
            >
              この割り当てで取り込む
            </button>
          </div>
        )}

        {error && (
          <p
            style={{
              marginTop: 12,
              color: 'var(--discord-accent-red)',
              fontSize: 14,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
