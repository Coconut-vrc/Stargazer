/**
 * ロジック6: 複数マッチング（仕様 4-4）
 * ユーザーをテーブルに固定（着席）、キャストをユニット（固定編成）で巡回。
 * 区分コードで完全分離。他ロジックと共通化しない。
 *
 * 配置ロジック（仕様 4-4）:
 *   - テーブル内の各キャストへの希望数をカウント
 *   - キャストユニットごとにスコアリング（ユニット内の全キャスト希望数を合算）
 *   - スコアが高いユニットを優先的に配置
 *   - NGユーザーチェック（除外モード: 自動排除、警告モード: ハイライト）
 */

import type { UserBean, CastBean } from '@/common/types/entities';
import type { MatchedCast, TableSlot, MatchingResult } from './matching-result-types';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';
import { isUserNGForCast } from './ng-judgment';

export interface MultipleMatchingParams {
  usersPerTable: number;
  castsPerRotation: number;
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

export function runMultipleMatching(
  winners: UserBean[],
  allCasts: CastBean[],
  params: MultipleMatchingParams,
  ngJudgmentType: NGJudgmentType,
  ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  const { usersPerTable, castsPerRotation, rotationCount } = params;
  const userMap = new Map<string, MatchedCast[]>();

  const activeCasts = allCasts.filter((c) => c.is_present);
  if (winners.length === 0 || activeCasts.length === 0) return { userMap };

  /* --- バリデーション --- */
  if (winners.length % usersPerTable !== 0) {
    console.error(
      `[M006] ユーザー数不整合: ${winners.length} は ${usersPerTable} で割り切れません`,
    );
    return { userMap };
  }
  if (activeCasts.length % castsPerRotation !== 0) {
    console.error(
      `[M006] キャスト数不整合: ${activeCasts.length} は ${castsPerRotation} で割り切れません`,
    );
    return { userMap };
  }

  const ROUNDS = Math.max(1, rotationCount);
  const tableCount = winners.length / usersPerTable;
  const unitCount = activeCasts.length / castsPerRotation;

  /* --- ユーザーをシャッフルしてテーブルに分割 --- */
  const shuffledUsers = [...winners].sort(() => Math.random() - 0.5);
  const tables: UserBean[][] = [];
  for (let t = 0; t < tableCount; t++) {
    tables.push(shuffledUsers.slice(t * usersPerTable, (t + 1) * usersPerTable));
  }

  /* --- キャストをシャッフルしてユニットに編成（固定パターン） --- */
  const shuffledCasts = [...activeCasts].sort(() => Math.random() - 0.5);
  const units: CastBean[][] = [];
  for (let u = 0; u < unitCount; u++) {
    units.push(shuffledCasts.slice(u * castsPerRotation, (u + 1) * castsPerRotation));
  }

  const isNg = (user: UserBean, cast: CastBean): boolean =>
    isUserNGForCast(user, cast, ngJudgmentType);
  const isNgForExclusion = ngMatchingBehavior === 'warn' ? () => false : isNg;

  /* -----------------------------------------------------------
   * 最適オフセット探索（対角線配置）
   *
   * テーブル t がローテーション r で見るユニット:
   *   units[(baseOffset + t + r) % unitCount]
   *
   * unitCount >= tableCount かつ unitCount >= ROUNDS であれば、
   * 各ローテーションで全テーブルが異なるユニットを見ることが保証される。
   * ----------------------------------------------------------- */

  type OffsetCandidate = { offset: number; weight: number };
  const offsetCandidates: OffsetCandidate[] = [];

  for (let base = 0; base < unitCount; base++) {
    let totalScore = 0;
    let valid = true;

    for (let t = 0; t < tableCount && valid; t++) {
      for (let r = 0; r < ROUNDS && valid; r++) {
        const unitIdx = (base + t + r) % unitCount;
        const unit = units[unitIdx];
        for (const cast of unit) {
          for (const user of tables[t]) {
            if (isNgForExclusion(user, cast)) {
              valid = false;
              break;
            }
            const rank = getPreferenceRank(user, cast.name);
            totalScore += RANK_WEIGHTS[rank] ?? DEFAULT_WEIGHT;
          }
          if (!valid) break;
        }
      }
    }

    if (valid) {
      offsetCandidates.push({ offset: base, weight: totalScore });
    }
  }

  /* フォールバック: 有効なオフセットがない場合はスコアで妥協 */
  let chosenOffset: number;
  if (offsetCandidates.length > 0) {
    chosenOffset = offsetCandidates[weightedRandomIndex(offsetCandidates)].offset;
  } else {
    let bestOffset = 0;
    let bestScore = -1;
    for (let base = 0; base < unitCount; base++) {
      let score = 0;
      for (let t = 0; t < tableCount; t++) {
        for (let r = 0; r < ROUNDS; r++) {
          const unitIdx = (base + t + r) % unitCount;
          const unit = units[unitIdx];
          for (const cast of unit) {
            for (const user of tables[t]) {
              const rank = getPreferenceRank(user, cast.name);
              score += RANK_WEIGHTS[rank] ?? DEFAULT_WEIGHT;
            }
          }
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestOffset = base;
      }
    }
    chosenOffset = bestOffset;
  }

  /* --- 結果を構築 --- */
  const tableSlots: TableSlot[] = [];

  for (let t = 0; t < tableCount; t++) {
    for (const user of tables[t]) {
      const matches: MatchedCast[] = [];
      for (let r = 0; r < ROUNDS; r++) {
        const unitIdx = (chosenOffset + t + r) % unitCount;
        const unit = units[unitIdx];
        for (const cast of unit) {
          const rank = getPreferenceRank(user, cast.name);
          matches.push({
            cast,
            rank: rank >= 1 && rank <= 3 ? rank : 0,
          });
        }
      }
      userMap.set(user.x_id, matches);
      tableSlots.push({ user, matches });
    }
  }

  return { userMap, tableSlots };
}
