/**
 * ロジック4: 空席込みローテーションマッチング（仕様 4-2）
 * 旧名称: 通常営業（ローテーション）
 * 空席あり得る。順番に回る。
 * 区分コードで完全分離。他ロジックと共通化しない。
 */

import type { UserBean, CastBean } from '@/common/types/entities';
import type { MatchedCast, TableSlot, MatchingResult } from './matching-result-types';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';
import { isUserNGForCast } from './ng-judgment';

const RANK_WEIGHTS: Record<number, number> = { 1: 100, 2: 70, 3: 40 };
const DEFAULT_WEIGHT = 10;

function getPreferenceRank(user: UserBean, castName: string): number {
  if (!user.casts || user.casts.length === 0) return 0;
  const idx = user.casts.indexOf(castName);
  if (idx === -1) return 0;
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

function buildTableSlots(
  baseCasts: CastBean[],
  winners: UserBean[],
  ROUNDS: number,
  chosenOffset: number,
  slotCount: number,
  getPreferenceRankFn: (user: UserBean, castName: string) => number,
): TableSlot[] {
  const slots: TableSlot[] = [];
  for (let row = 0; row < slotCount; row++) {
    const history: MatchedCast[] = [];
    const user = row < winners.length ? winners[row] : null;
    for (let r = 0; r < ROUNDS; r++) {
      const idx = (chosenOffset + row - r + baseCasts.length) % baseCasts.length;
      const cast = baseCasts[idx];
      const prefRank = user ? getPreferenceRankFn(user, cast.name) : 0;
      const rank = prefRank >= 1 && prefRank <= 3 ? prefRank : 0;
      history.push({ cast, rank });
    }
    slots.push({ user: user ?? null, matches: history });
  }
  return slots;
}

export function runVacantRotation(
  winners: UserBean[],
  allCasts: CastBean[],
  rotationCount: number,
  totalTables: number,
  ngJudgmentType: NGJudgmentType,
  ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  const userMap = new Map<string, MatchedCast[]>();
  let tableSlots: TableSlot[] | undefined;
  const activeCasts = allCasts.filter((c) => c.is_present);
  if (winners.length === 0 || activeCasts.length === 0) return { userMap };

  const ROUNDS = Math.max(1, rotationCount || 1);
  const shuffledCasts = [...activeCasts].sort(() => Math.random() - 0.5);
  const userCount = winners.length;
  const slotCount = Math.max(totalTables, userCount);
  const baseCasts = shuffledCasts;
  const scoringRows = Math.min(userCount, baseCasts.length);

  const isNg = (user: UserBean, cast: CastBean): boolean =>
    isUserNGForCast(user, cast, ngJudgmentType);
  const isNgForExclusion = ngMatchingBehavior === 'warn' ? () => false : isNg;

  type OffsetCandidate = { offset: number; weight: number };
  const offsetCandidates: OffsetCandidate[] = [];
  for (let offset = 0; offset < baseCasts.length; offset++) {
    let totalScore = 0;
    let valid = true;
    for (let row = 0; row < scoringRows; row++) {
      const user = winners[row];
      for (let r = 0; r < ROUNDS; r++) {
        const idx = (offset + row - r + baseCasts.length) % baseCasts.length;
        const cast = baseCasts[idx];
        if (isNgForExclusion(user, cast)) {
          valid = false;
          break;
        }
        const prefRank = getPreferenceRank(user, cast.name);
        totalScore += RANK_WEIGHTS[prefRank] ?? DEFAULT_WEIGHT;
      }
      if (!valid) break;
    }
    if (valid) offsetCandidates.push({ offset, weight: totalScore });
  }

  if (offsetCandidates.length === 0) {
    const chosenOffset = 0;
    for (let row = 0; row < scoringRows; row++) {
      const user = winners[row];
      const history: MatchedCast[] = [];
      for (let r = 0; r < ROUNDS; r++) {
        const idx = (chosenOffset + row - r + baseCasts.length) % baseCasts.length;
        const cast = baseCasts[idx];
        const prefRank = isNgForExclusion(user, cast)
          ? 0
          : getPreferenceRank(user, cast.name);
        history.push({ cast, rank: prefRank >= 1 && prefRank <= 3 ? prefRank : 0 });
      }
      userMap.set(user.x_id, history);
    }
    tableSlots = buildTableSlots(
      baseCasts,
      winners,
      ROUNDS,
      chosenOffset,
      slotCount,
      getPreferenceRank,
    );
    return { userMap, tableSlots };
  }

  const chosenOffset = offsetCandidates[weightedRandomIndex(offsetCandidates)].offset;
  for (let row = 0; row < scoringRows; row++) {
    const user = winners[row];
    const history: MatchedCast[] = [];
    for (let r = 0; r < ROUNDS; r++) {
      const idx = (chosenOffset + row - r + baseCasts.length) % baseCasts.length;
      const cast = baseCasts[idx];
      const prefRank = getPreferenceRank(user, cast.name);
      history.push({ cast, rank: prefRank >= 1 && prefRank <= 3 ? prefRank : 0 });
    }
    userMap.set(user.x_id, history);
  }
  tableSlots = buildTableSlots(
    baseCasts,
    winners,
    ROUNDS,
    chosenOffset,
    slotCount,
    getPreferenceRank,
  );
  return { userMap, tableSlots };
}
