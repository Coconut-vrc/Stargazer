/**
 * ロジック5: グループマッチング（仕様 4-3）
 * 応募者をグループに振り分け、グループごとにキャストローテーション。
 * 区分コードで完全分離。他ロジックと共通化しない。
 *
 * 配置優先順位（仕様 4-3）:
 *   1. NGユーザー有無を最優先チェック
 *   2. 希望数による重み付け
 *   3. 希望キャスト設定がある場合、そのグループに優先配置
 */

import type { UserBean, CastBean } from '@/common/types/entities';
import type { MatchedCast, TableSlot, MatchingResult } from './matching-result-types';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';
import { isUserNGForCast } from './ng-judgment';

export interface GroupMatchingParams {
  groupCount: number;
  usersPerGroup: number;
  rotationCount: number;
}

/* ---------- 内部ユーティリティ（ロジック完全分離のため独立定義） ---------- */

const RANK_WEIGHTS: Record<number, number> = { 1: 100, 2: 70, 3: 40 };
const DEFAULT_WEIGHT = 10;

function getPreferenceRank(user: UserBean, castName: string): number {
  if (!user.casts || user.casts.length === 0) return 0;
  const idx = user.casts.indexOf(castName);
  return idx >= 0 && idx <= 2 ? idx + 1 : 0;
}

function weightedRandomIndex(items: { weight: number }[]): number {
  const total = items.reduce((sum, it) => sum + it.weight, 0);
  if (total <= 0) return Math.floor(Math.random() * items.length);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight;
    if (r <= 0) return i;
  }
  return items.length - 1;
}

/* ---------- 本体 ---------- */

export function runGroupMatching(
  winners: UserBean[],
  allCasts: CastBean[],
  params: GroupMatchingParams,
  ngJudgmentType: NGJudgmentType,
  ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  const { groupCount, usersPerGroup, rotationCount } = params;
  const userMap = new Map<string, MatchedCast[]>();

  /* --- バリデーション --- */
  const expectedCount = groupCount * usersPerGroup;
  if (winners.length !== expectedCount) {
    console.error(
      `[M005] ユーザー数不整合: 期待=${expectedCount} (${groupCount}×${usersPerGroup}), 実際=${winners.length}`,
    );
    return { userMap };
  }

  const activeCasts = allCasts.filter((c) => c.is_present);
  if (activeCasts.length === 0) return { userMap };

  const ROUNDS = Math.max(1, rotationCount);
  const castCount = activeCasts.length;

  /* --- ユーザーをシャッフルしてグループに分割 --- */
  const shuffled = [...winners].sort(() => Math.random() - 0.5);
  const groups: UserBean[][] = [];
  for (let g = 0; g < groupCount; g++) {
    groups.push(shuffled.slice(g * usersPerGroup, (g + 1) * usersPerGroup));
  }

  /* --- キャストをシャッフル --- */
  const shuffledCasts = [...activeCasts].sort(() => Math.random() - 0.5);

  const isNg = (user: UserBean, cast: CastBean): boolean =>
    isUserNGForCast(user, cast, ngJudgmentType);
  const isNgForExclusion = ngMatchingBehavior === 'warn' ? () => false : isNg;

  /* -----------------------------------------------------------
   * オフセット探索（対角線配置）
   *
   * グループ g がローテーション r で見るキャスト:
   *   shuffledCasts[(baseOffset + g + r) % castCount]
   *
   * castCount >= groupCount であれば、各ローテーションで
   * 全グループが異なるキャストを見ることが保証される。
   * ----------------------------------------------------------- */

  type OffsetCandidate = { baseOffset: number; weight: number };
  const offsetCandidates: OffsetCandidate[] = [];

  for (let base = 0; base < castCount; base++) {
    let totalScore = 0;
    let valid = true;

    for (let g = 0; g < groupCount && valid; g++) {
      for (let r = 0; r < ROUNDS && valid; r++) {
        const cast = shuffledCasts[(base + g + r) % castCount];
        for (const user of groups[g]) {
          if (isNgForExclusion(user, cast)) {
            valid = false;
            break;
          }
          const rank = getPreferenceRank(user, cast.name);
          totalScore += RANK_WEIGHTS[rank] ?? DEFAULT_WEIGHT;
        }
      }
    }

    if (valid) {
      offsetCandidates.push({ baseOffset: base, weight: totalScore });
    }
  }

  /* フォールバック: 有効なオフセットがない場合はスコアで妥協（NG付きでも配置） */
  let chosenBase: number;
  if (offsetCandidates.length > 0) {
    chosenBase = offsetCandidates[weightedRandomIndex(offsetCandidates)].baseOffset;
  } else {
    /* NG回避不可能 — 全オフセットのスコアを計算し最良を選択 */
    let bestBase = 0;
    let bestScore = -1;
    for (let base = 0; base < castCount; base++) {
      let score = 0;
      for (let g = 0; g < groupCount; g++) {
        for (let r = 0; r < ROUNDS; r++) {
          const cast = shuffledCasts[(base + g + r) % castCount];
          for (const user of groups[g]) {
            const rank = getPreferenceRank(user, cast.name);
            score += RANK_WEIGHTS[rank] ?? DEFAULT_WEIGHT;
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestBase = base;
      }
    }
    chosenBase = bestBase;
  }

  /* --- 結果を構築 --- */
  const tableSlots: TableSlot[] = [];

  for (let g = 0; g < groupCount; g++) {
    for (const user of groups[g]) {
      const matches: MatchedCast[] = [];
      for (let r = 0; r < ROUNDS; r++) {
        const cast = shuffledCasts[(chosenBase + g + r) % castCount];
        const rank = getPreferenceRank(user, cast.name);
        matches.push({
          cast,
          rank: rank >= 1 && rank <= 3 ? rank : 0,
        });
      }
      userMap.set(user.x_id, matches);
      tableSlots.push({ user, matches });
    }
  }

  return { userMap, tableSlots };
}
