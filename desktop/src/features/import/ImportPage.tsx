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
  const [importStyle, setImportStyle] = useState<ImportStyle>('custom');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customRows, setCustomRows] = useState<string[][] | null>(null);
  /** カスタム時: CSVの1行目（ヘッダー）。列の選択肢に実際の値として表示する */
  const [customHeaderRow, setCustomHeaderRow] = useState<string[] | null>(null);
  const [customMapping, setCustomMapping] = useState<ColumnMapping>(() =>
    createEmptyColumnMapping()
  );
  /** カスタム時: この列をカンマ区切りで希望1・2・3に分割して使う（-1=使わない） */
  const [splitCommaColumnIndex, setSplitCommaColumnIndex] = useState<number>(-1);


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
    setCustomHeaderRow(null);
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
      const headerRows = 1;
      if (rows.length <= headerRows) {
        setError('データ行がありません。');
        setLoading(false);
        return;
      }
      const dataRows = rows.slice(headerRows) as string[][];

      const headerRow = (rows[0] ?? []) as string[];
      setCustomHeaderRow(headerRow);
      setCustomRows(dataRows);
      const maxCol = Math.max(0, ...dataRows.map((r) => r.length), headerRow.length) - 1;
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
      setError('ユーザー名・VRCアカウントID・アカウントID(X)のいずれかは必ず列を指定してください。');
      return;
    }
    // 実際にマップされた列（-1 以外）の最大インデックスのみをチェック
    const minCols = getMinColumnsFromMapping(customMapping);
    if (minCols > 0) {
      const maxIndex = minCols - 1;
      const shortRows = customRows
        .map((row, i) => ({ rowIndex: i + 1, len: row.length }))
        .filter(({ len }) => len <= maxIndex);
      if (shortRows.length > 0) {
        const sample =
          shortRows.length > 5
            ? `行 ${shortRows.slice(0, 5).map((r) => r.rowIndex).join(', ')} 他${shortRows.length}行`
            : `行 ${shortRows.map((r) => r.rowIndex).join(', ')}`;
        setError(`列数が足りない行があります: ${sample}`);
        return;
      }
    }
    const options: MapRowOptions | undefined =
      splitCommaColumnIndex >= 0
        ? { splitCommaColumnIndex }
        : undefined;

    // 確定項目(name, x_id, cast1～3)以外をカスタム列として raw_extra に渡す
    const fixedIndices = new Set(
      [customMapping.name, customMapping.x_id, customMapping.cast1, customMapping.cast2, customMapping.cast3].filter(
        (i) => i >= 0
      )
    );
    const extraColumns: { columnIndex: number; label: string }[] = [];
    const maxCol = Math.max(maxColIndex + 1, 0);
    for (let i = 0; i < maxCol; i++) {
      const headerLabel = (customHeaderRow?.[i] ?? '').trim() || `列${i + 1}`;
      if (customMapping.timestamp === i) {
        extraColumns.push({ columnIndex: i, label: headerLabel || IMPORT_COLUMN_LABELS.timestamp });
      } else if (customMapping.first_flag === i) {
        extraColumns.push({ columnIndex: i, label: headerLabel || IMPORT_COLUMN_LABELS.first_flag });
      } else if (customMapping.note === i) {
        extraColumns.push({ columnIndex: i, label: headerLabel || IMPORT_COLUMN_LABELS.note });
      } else if (customMapping.is_pair_ticket === i) {
        extraColumns.push({ columnIndex: i, label: headerLabel || IMPORT_COLUMN_LABELS.is_pair_ticket });
      } else if (!fixedIndices.has(i)) {
        extraColumns.push({ columnIndex: i, label: headerLabel });
      }
    }
    const mappingWithExtra = { ...customMapping, extraColumns };

    onImportUserRows(customRows, mappingWithExtra, options);
  };

  const maxColIndex = customRows || customHeaderRow
    ? Math.max(
        0,
        ...(customRows?.map((r) => r.length) ?? []),
        customHeaderRow?.length ?? 0
      ) - 1
    : 0;
  /** 各列の表示ラベル: ヘッダーの値、なければ1行目の値。括弧で列番号を表示。 */
  const columnOptions = Array.from({ length: maxColIndex + 1 }, (_, i) => {
    const headerVal = (customHeaderRow?.[i] ?? '').trim();
    const sampleVal = (customRows?.[0]?.[i] ?? '').trim();
    const content = headerVal || sampleVal || '';
    const short = content.length > 20 ? `${content.slice(0, 18)}…` : content;
    const label = short ? `列${i + 1}: ${short}` : `列${i + 1}`;
    return { value: i, label };
  });

  return (
    <div className="page-wrapper">
      <div className="page-card-narrow">
        <h2 className="page-header-title page-header-title--md">データ読取</h2>
        <p className="page-header-subtitle form-subtitle-mb">
          応募データ（CSV）をファイルで取り込みます。CSVを選択後、列の割り当てとカンマ区切り分割の有無を指定できます。ユーザー名・VRCアカウントID・アカウントID(X)のいずれかは必須です。
        </p>

        {/* インポート形式の選択は不要になったため削除 */}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="btn-primary btn-full-width"
            onClick={handleSelectFile}
            disabled={loading}
          >
            {loading ? '読み込み中...' : 'CSVファイルを選択'}
          </button>
          {/* ここにCSVダウンロードリンクがあったがデバッグタブに移動 */}
        </div>

        {customRows !== null && customRows.length > 0 && (
          <div className="form-group form-group-spacing" style={{ marginTop: 24 }}>
            <label className="form-label">列の割り当て</label>
            <p className="form-inline-note form-note-mt" style={{ marginBottom: 8 }}>
              {customRows.length} 行読み込みました。各項目に、CSVのどの列（1行目の値で表示）を差し込むか選んでください。ユーザー名・VRCアカウントID・アカウントID(X)のいずれかは必須です。
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
