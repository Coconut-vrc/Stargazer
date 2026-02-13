/**
 * ロジック1: 完全ランダムマッチング（仕様 4-2）
 * 旧名称: 特別営業（ランダム）
 * 全ユーザーに必ずキャストを配置。空席なし。ランダムに配置。
 * 区分コードで完全分離。他ロジックと共通化しない。
 */

import type { UserBean, CastBean } from '@/stores/AppContext';
import type { MatchedCast, MatchingResult } from './matching-result-types';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';
import { isUserNGForCast } from './ng-judgment';

const RANK_WEIGHTS: Record<number, number> = { 1: 100, 2: 70, 3: 40 };
const DEFAULT_WEIGHT = 10;

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

export function runCompleteRandom(
  winners: UserBean[],
  allCasts: CastBean[],
  rotationCount: number,
  ngJudgmentType: NGJudgmentType,
  ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  const userMap = new Map<string, MatchedCast[]>();
  const activeCasts = allCasts.filter((c) => c.is_present);
  if (winners.length === 0 || activeCasts.length === 0) return { userMap };

  const ROUNDS = Math.max(1, rotationCount || 1);
  const shuffledCasts = [...activeCasts].sort(() => Math.random() - 0.5);
  const isNg = (user: UserBean, cast: CastBean): boolean =>
    isUserNGForCast(user, cast, ngJudgmentType);
  const isNgForExclusion = ngMatchingBehavior === 'warn' ? () => false : isNg;

  const hasPreferredInHistory = (history: MatchedCast[]): boolean =>
    history.some((m) => m.rank >= 1 && m.rank <= 3);
  const resultMap = new Map<string, MatchedCast[]>();
  winners.forEach((w) => resultMap.set(w.x_id, []));

  for (let round = 0; round < ROUNDS; round++) {
    let availableThisRound = [...shuffledCasts];
    const shuffledWinnersForRound = [...winners].sort(() => Math.random() - 0.5);
    const needsPreferred: UserBean[] = [];
    const others: UserBean[] = [];
    for (const user of shuffledWinnersForRound) {
      const history = resultMap.get(user.x_id) ?? [];
      if (hasPreferredInHistory(history)) others.push(user);
      else needsPreferred.push(user);
    }
    const orderedUsers = [...needsPreferred, ...others];

    for (const user of orderedUsers) {
      const history = resultMap.get(user.x_id) ?? [];
      type PreferredCandidate = { cast: CastBean; rank: number; weight: number };
      const preferredCandidates: PreferredCandidate[] = [];
      if (user.casts && user.casts.length > 0) {
        for (let i = 0; i < Math.min(3, user.casts.length); i++) {
          const wantedName = user.casts[i];
          if (!wantedName || wantedName.trim() === '') continue;
          const cast = availableThisRound.find(
            (c) =>
              c.name === wantedName &&
              !isNgForExclusion(user, c) &&
              !history.some((h) => h.cast.name === c.name),
          );
          if (cast) {
            const rank = i + 1;
            preferredCandidates.push({
              cast,
              rank,
              weight: RANK_WEIGHTS[rank] ?? DEFAULT_WEIGHT,
            });
          }
        }
      }

      let selected: { cast: CastBean; rank: number } | null = null;
      if (preferredCandidates.length > 0) {
        const idx = weightedRandomIndex(preferredCandidates);
        selected = {
          cast: preferredCandidates[idx].cast,
          rank: preferredCandidates[idx].rank,
        };
      } else {
        const fallbackCandidates = availableThisRound.filter(
          (c) =>
            !isNgForExclusion(user, c) &&
            !history.some((h) => h.cast.name === c.name),
        );
        if (fallbackCandidates.length > 0) {
          const c =
            fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
          selected = { cast: c, rank: 0 };
        }
      }
      if (selected) {
        resultMap.set(user.x_id, [...history, { cast: selected.cast, rank: selected.rank }]);
        availableThisRound = availableThisRound.filter((c) => c.name !== selected!.cast.name);
      }
    }
  }
  return { userMap: resultMap };
}
