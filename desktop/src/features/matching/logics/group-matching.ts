/**
 * ロジック5: グループマッチング（仕様 4-3）
 * 新規実装。応募者をグループに振り分け、グループごとにローテーション。
 * 区分コードで完全分離。
 * ※ 未実装。UIで選択された場合のエントリポイント用スタブ。
 */

import type { UserBean, CastBean } from '@/stores/AppContext';
import type { MatchingResult } from './matching-result-types';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';

export interface GroupMatchingParams {
  groupCount: number;
  usersPerGroup: number;
  rotationCount: number;
}

export function runGroupMatching(
  _winners: UserBean[],
  _allCasts: CastBean[],
  _params: GroupMatchingParams,
  _ngJudgmentType: NGJudgmentType,
  _ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  return { userMap: new Map() };
}
