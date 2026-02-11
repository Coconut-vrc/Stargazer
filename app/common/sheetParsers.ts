/**
 * スプレッドシート行データのパース処理
 * 応募者シート・キャストシート・抽選結果シートで共通利用
 */

import type { UserBean, CastBean } from './types/entities';
import { USER_SHEET, USER_SHEET_BY_MODE, CAST_SHEET } from './sheetColumns';

type BusinessMode = 'special' | 'normal';

/**
 * 希望キャストをパースする（営業モードに応じて）
 * - 特別営業: E列、F列、G列からそれぞれ1つずつ
 * - 通常営業: E列のカンマ区切り 1〜3名
 * - 常に3要素の配列を返す（不足分は空文字列）
 */
export function parseCastsFromRow(row: unknown[], mode: BusinessMode): string[] {
  const { CAST_E, CAST_F, CAST_G } = USER_SHEET;
  let parsed: string[];
  if (mode === 'normal') {
    const eColumn = (row[CAST_E] ?? '').toString().trim();
    if (!eColumn) {
      parsed = [];
    } else {
      parsed = eColumn
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 3);
      parsed = Array.from(new Set(parsed));
    }
  } else {
    parsed = [row[CAST_E], row[CAST_F], row[CAST_G]]
      .map((val) => (val ?? '').toString().trim())
      .filter(Boolean);
  }
  while (parsed.length < 3) parsed.push('');
  return parsed.slice(0, 3);
}

/**
 * 応募者シート／抽選結果シートの1行を UserBean に変換
 */
export function mapRowToUserBean(row: unknown[], businessMode: BusinessMode): UserBean {
  const { TIMESTAMP, NAME, X_ID, FIRST_FLAG } = USER_SHEET;
  const { NOTE, IS_PAIR_TICKET } = USER_SHEET_BY_MODE[businessMode];
  const casts = parseCastsFromRow(row, businessMode);
  return {
    timestamp: (row[TIMESTAMP] ?? '').toString(),
    name: (row[NAME] ?? '').toString(),
    x_id: (row[X_ID] ?? '').toString(),
    first_flag: (row[FIRST_FLAG] ?? '').toString(),
    casts,
    note: (row[NOTE] ?? '').toString(),
    is_pair_ticket: (row[IS_PAIR_TICKET] ?? '') === '1',
    raw_extra: [],
  };
}

/**
 * キャストシートの行配列を CastBean[] に変換（空名は除外）
 */
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
