/**
 * マッチング形式の区分コード（仕様 4-1）。
 * 抽選条件で選択する7種類。ロジックは M001～M006 で完全分離。
 */

export const MATCHING_TYPE_CODES = [
  'NONE',
  'M001',
  'M002',
  'M006',
] as const;

export type MatchingTypeCode = (typeof MATCHING_TYPE_CODES)[number];

/** プルダウン用ラベル（仕様 4-1 の1～6に対応） */
export const MATCHING_TYPE_LABELS: Record<MatchingTypeCode, string> = {
  NONE: 'マッチングは使用しない',
  M001: '完全ランダムマッチング',
  M002: '完全ローテーションマッチング',
  M006: '複数マッチング',
};

/** 完全マッチング（空席なし）＝ M001, M002 */
export function isCompleteMatching(code: MatchingTypeCode): boolean {
  return code === 'M001' || code === 'M002';
}

/** ローテーション方式 ＝ M002 */
export function isRotationMatching(code: MatchingTypeCode): boolean {
  return code === 'M002';
}
