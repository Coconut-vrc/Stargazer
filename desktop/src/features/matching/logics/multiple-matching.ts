/**
 * ロジック6: 複数マッチング（仕様 4-4）
 * 新規実装。1テーブルあたりのユーザー数・1ローテあたりのキャスト数でユニット編成し巡回。
 * 区分コードで完全分離。
 * ※ 未実装。UIで選択された場合のエントリポイント用スタブ。
 */

import type { UserBean, CastBean } from '@/stores/AppContext';
import type { MatchingResult } from './matching-result-types';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';

export interface MultipleMatchingParams {
  usersPerTable: number;
  castsPerRotation: number;
  rotationCount: number;
}

export function runMultipleMatching(
  _winners: UserBean[],
  _allCasts: CastBean[],
  _params: MultipleMatchingParams,
  _ngJudgmentType: NGJudgmentType,
  _ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  return { userMap: new Map() };
}
