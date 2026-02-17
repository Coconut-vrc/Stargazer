/**
 * ロジック2: ローテーションマッチング（仕様 v2.3 — M002）
 * 空席込み。totalTables で総テーブル数を指定し、空席テーブルもローテ対象にする。
 * 区分コードで完全分離。他ロジックと共通化しない。
 *
 * 配置ロジック:
 *   - totalTables スロットに当選者を配置。残りは空席（user: null）。
 *   - キャストは全スロット（空席含む）を循環ローテーション。
 *   - 希望キャスト第1〜第3のみ重み付け。第4希望以降は重み付け無し。
 *   - 最適オフセットを希望スコアで選択（重み付きランダム）。
 *   - NGユーザー除外モード: 自動排除。警告モード: フラグ付与（service 側）。
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

export function runRotationMatching(
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
  const slotCount = totalTables;
  const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);
  const shuffledCasts = [...activeCasts].sort(() => Math.random() - 0.5);
  const baseCasts = shuffledCasts.slice(0, Math.min(slotCount, shuffledCasts.length));

  const isNg = (user: UserBean, cast: CastBean): boolean =>
    isUserNGForCast(user, cast, ngJudgmentType);
  const isNgForExclusion = ngMatchingBehavior === 'warn' ? () => false : isNg;

  /* -----------------------------------------------------------
   * 最適オフセット探索
   *
   * スロット i がローテーション r で見るキャスト:
   *   baseCasts[(offset + i - r + baseCasts.length) % baseCasts.length]
   *
   * ユーザーが入っているスロット (i < winners.length) のみスコアリング。
   * 空席スロットは巡回対象だがスコアに影響しない。
   * ----------------------------------------------------------- */

  type OffsetCandidate = { offset: number; weight: number };
  const offsetCandidates: OffsetCandidate[] = [];
  const scoringRows = Math.min(shuffledWinners.length, baseCasts.length);

  for (let offset = 0; offset < baseCasts.length; offset++) {
    let totalScore = 0;
    let valid = true;
    for (let row = 0; row < scoringRows; row++) {
      const user = shuffledWinners[row];
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

  /* 有効なオフセットがない場合 = 全てのオフセットにNGペアが含まれる
     → NGは絶対排除とし、マッチング不成立として警告を返す */
  if (offsetCandidates.length === 0) {
    console.error(
      `[M002] NG排除不可: 全${baseCasts.length}オフセットにNGペアが含まれています。キャストの欠席設定または当選者の変更が必要です。`,
    );
    return { userMap, ngConflict: true };
  }

  const chosenOffset = offsetCandidates[weightedRandomIndex(offsetCandidates)].offset;

  /* --- 結果構築 --- */
  const tableSlots: TableSlot[] = [];
  for (let row = 0; row < slotCount; row++) {
    const user = row < shuffledWinners.length ? shuffledWinners[row] : null;
    const history: MatchedCast[] = [];
    for (let r = 0; r < ROUNDS; r++) {
      const idx = (chosenOffset + row - r + baseCasts.length) % baseCasts.length;
      if (idx < baseCasts.length) {
        const cast = baseCasts[idx];
        const prefRank = user ? getPreferenceRank(user, cast.name) : 0;
        const rank = prefRank >= 1 ? prefRank : 0;
        history.push({ cast, rank });
      }
    }
    if (user) {
      userMap.set(user.x_id, history);
    }
    tableSlots.push({ user: user ?? null, matches: history });
  }

  return { userMap, tableSlots };
}
