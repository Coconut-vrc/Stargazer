import type { UserBean, CastBean } from './types/entities';
import { CAST_SHEET } from './sheetColumns';
import type { ColumnMapping } from './importFormat';

function getCell(row: unknown[], colIndex: number): string {
  if (colIndex < 0 || colIndex >= row.length) return '';
  return (row[colIndex] ?? '').toString().trim();
}

/** 1行を UserBean に変換するときのオプション（カスタム用） */
export interface MapRowOptions {
  /** この列をカンマ区切りで分割し希望1・2・3に充てる（-1のときは使わない） */
  splitCommaColumnIndex?: number;
}

/** カラムマッピングに従って1行を UserBean に変換する（テンプレート／カスタム用） */
export function mapRowToUserBeanWithMapping(
  row: unknown[],
  mapping: ColumnMapping,
  options?: MapRowOptions
): UserBean {
  let casts: string[];
  const splitCol = options?.splitCommaColumnIndex;
  const useSplitComma =
    splitCol !== undefined && splitCol >= 0 && mapping.cast1 === splitCol;
  /** 希望キャストが1列（カンマ区切り or 単一列）のとき */
  const useSingleCastColumn =
    mapping.cast2 < 0 && mapping.cast3 < 0 && mapping.cast1 >= 0;

  if (useSplitComma) {
    const cast1Val = getCell(row, mapping.cast1);
    if (!cast1Val) {
      casts = ['', '', ''];
    } else {
      casts = cast1Val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      while (casts.length < 3) casts.push('');
    }
  } else if (useSingleCastColumn) {
    const cast1Val = getCell(row, mapping.cast1);
    if (!cast1Val || mapping.cast1 < 0) {
      casts = ['', '', ''];
    } else {
      casts = cast1Val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      casts = Array.from(new Set(casts));
      while (casts.length < 3) casts.push('');
    }
  } else {
    const c1 = mapping.cast1 >= 0 ? getCell(row, mapping.cast1) : '';
    const c2 = mapping.cast2 >= 0 ? getCell(row, mapping.cast2) : '';
    const c3 = mapping.cast3 >= 0 ? getCell(row, mapping.cast3) : '';
    casts = [c1, c2, c3];
    while (casts.length < 3) casts.push('');
  }

  const namePrimary = mapping.name >= 0 ? getCell(row, mapping.name) : '';
  const nameFallback = mapping.nameColumn2 != null && mapping.nameColumn2 >= 0 ? getCell(row, mapping.nameColumn2) : '';
  const name = namePrimary || nameFallback;

  const rawExtra: { key: string; value: string }[] = [];
  if (mapping.extraColumns?.length) {
    for (const e of mapping.extraColumns) {
      rawExtra.push({ key: e.label, value: getCell(row, e.columnIndex) });
    }
  }

  return {
    timestamp: mapping.timestamp >= 0 ? getCell(row, mapping.timestamp) : '',
    name,
    x_id: mapping.x_id >= 0 ? getCell(row, mapping.x_id) : '',
    first_flag: mapping.first_flag >= 0 ? getCell(row, mapping.first_flag) : '',
    casts: casts.slice(0, 3),
    note: mapping.note >= 0 ? getCell(row, mapping.note) : '',
    is_pair_ticket: mapping.is_pair_ticket >= 0 && getCell(row, mapping.is_pair_ticket) === '1',
    raw_extra: rawExtra,
  };
}

export function parseCastSheetRows(rows: unknown[][]): CastBean[] {
  return rows
    .map((row) => ({
      name: (row[CAST_SHEET.NAME] ?? '').toString().trim(),
      is_present: (row[CAST_SHEET.IS_PRESENT] ?? '') === '1',
      ng_users: (row[CAST_SHEET.NG_USERS] ?? '')
        ? (row[CAST_SHEET.NG_USERS] as string).split(',').map((s: string) => s.trim())
        : [],
    }))
    .filter((c) => c.name);
}

/** キャスト一覧を cast-data.csv 用の CSV 文字列に変換する（ヘッダー付き） */
function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function castBeansToCsvContent(casts: CastBean[]): string {
  const header = 'キャストリスト,欠勤フラグ,NGユーザー';
  const dataLines = casts.map((c) => {
    const name = escapeCsvCell(c.name);
    const isPresent = c.is_present ? '1' : '0';
    const ngUsers = escapeCsvCell(c.ng_users.join(','));
    return `${name},${isPresent},${ngUsers}`;
  });
  return [header, ...dataLines].join('\n');
}
