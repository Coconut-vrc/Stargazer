/**
 * ロジック1: ランダムマッチング（仕様 v2.3 — M001）
 * 空席込み。totalTables で総テーブル数を指定し、空席テーブルもローテ対象にする。
 * 区分コードで完全分離。他ロジックと共通化しない。
 *
 * 配置ロジック:
 *   - 希望キャスト第1〜第3のみ重み付けで優先配置。第4希望以降は重み付け無し。
 *   - 空席テーブル分のキャストは毎ラウンドランダムに消費される。
 *   - NGユーザー除外モード: アルゴリズム内部で自動排除。
 *   - NGユーザー警告モード: マッチング後にフラグ付与（service 側で処理）。
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
  return idx >= 0 ? idx + 1 : 0;
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

export function runRandomMatching(
  winners: UserBean[],
  allCasts: CastBean[],
  totalTables: number,
  rotationCount: number,
  ngJudgmentType: NGJudgmentType,
  ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  const userMap = new Map<string, MatchedCast[]>();
  const activeCasts = allCasts.filter((c) => c.is_present);
  if (winners.length === 0 || activeCasts.length === 0) return { userMap };

  const ROUNDS = Math.max(1, rotationCount || 1);
  const vacantCount = Math.max(0, totalTables - winners.length);
  const shuffledCasts = [...activeCasts].sort(() => Math.random() - 0.5);
  const isNg = (user: UserBean, cast: CastBean): boolean =>
    isUserNGForCast(user, cast, ngJudgmentType);
  const isNgForExclusion = ngMatchingBehavior === 'warn' ? () => false : isNg;

  const hasPreferredInHistory = (history: MatchedCast[]): boolean =>
    history.some((m) => m.rank >= 1 && m.rank <= 3);
  const resultMap = new Map<string, MatchedCast[]>();
  winners.forEach((w) => resultMap.set(w.x_id, []));

  for (let round = 0; round < ROUNDS; round++) {
    let availableThisRound = [...shuffledCasts].sort(() => Math.random() - 0.5);

    // 空席テーブル分のキャストをランダムに消費
    if (vacantCount > 0 && availableThisRound.length > vacantCount) {
      availableThisRound = availableThisRound.slice(vacantCount);
    }

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
          const rank = getPreferenceRank(user, c.name);
          selected = { cast: c, rank };
        }
      }
      if (selected) {
        resultMap.set(user.x_id, [...history, { cast: selected.cast, rank: selected.rank }]);
        availableThisRound = availableThisRound.filter((c) => c.name !== selected!.cast.name);
      }
    }
  }

  // tableSlots 構築（空席込み）
  const tableSlots: TableSlot[] = winners.map((user) => ({
    user,
    matches: resultMap.get(user.x_id) ?? [],
  }));
  for (let v = 0; v < vacantCount; v++) {
    tableSlots.push({ user: null, matches: [] });
  }

  return { userMap: resultMap, tableSlots };
}
