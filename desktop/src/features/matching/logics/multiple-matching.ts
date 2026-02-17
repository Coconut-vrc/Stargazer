/**
 * M003: 多対多マッチング
 * ユーザーをテーブルに固定（着席）、キャストをユニット（固定編成）で巡回。
 * 区分コードで完全分離。他ロジックと共通化しない。
 *
 * 配置ロジック:
 *   - テーブル内の各キャストへの希望数をカウント
 *   - キャストユニットごとにスコアリング（ユニット内の全キャスト希望数を合算）
 *   - スコアが高いユニットを優先的に配置
 *   - NGユーザーチェック（除外モード: 自動排除、警告モード: ハイライト）
 *   - 空席対応: 当選者数がusersPerTableの倍数でない場合、最後のテーブルに空席を配置
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
  if (activeCasts.length % castsPerRotation !== 0) {
    console.error(
      `[M003] キャスト数不整合: ${activeCasts.length} は ${castsPerRotation} で割り切れません`,
    );
    return { userMap };
  }

  const ROUNDS = Math.max(1, rotationCount);
  /* 空席対応: 端数が出る場合はテーブル数を切り上げ */
  const tableCount = Math.ceil(winners.length / usersPerTable);
  const unitCount = activeCasts.length / castsPerRotation;

  /* --- 重複配置防止バリデーション --- */
  if (unitCount < tableCount) {
    console.error(
      `[M003] ユニット数不足: ${unitCount}ユニット < ${tableCount}テーブル。同ローテで同じキャストが複数テーブルに配置されます。`,
    );
    return { userMap };
  }

  /* --- ユーザーをシャッフルしてテーブルに分割（端数テーブル対応） --- */
  const shuffledUsers = [...winners].sort(() => Math.random() - 0.5);
  const tables: UserBean[][] = [];
  for (let t = 0; t < tableCount; t++) {
    const start = t * usersPerTable;
    const end = Math.min(start + usersPerTable, shuffledUsers.length);
    tables.push(shuffledUsers.slice(start, end));
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
        const unitIdx = (base - t + r + unitCount * ROUNDS) % unitCount; // テーブル1→2の順に巡回
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

  /* 有効なオフセットがない場合 = 全てのオフセットにNGペアが含まれる
     → NGは絶対排除とし、マッチング不成立として警告を返す */
  if (offsetCandidates.length === 0) {
    console.error(
      `[M003] NG排除不可: 全${unitCount}オフセットにNGペアが含まれています。キャストの欠席設定または当選者の変更が必要です。`,
    );
    return { userMap, ngConflict: true };
  }

  const chosenOffset = offsetCandidates[weightedRandomIndex(offsetCandidates)].offset;

  /* --- 結果を構築 --- */
  /* matches配列レイアウト: matches[r * castsPerRotation + c] = ローテーション r のキャスト c */
  const tableSlots: TableSlot[] = [];

  for (let t = 0; t < tableCount; t++) {
    /* テーブル t のローテーション別キャストユニットを事前計算（空席にも同じmatches を割り当てるため） */
    const tableMatches: MatchedCast[] = [];
    for (let r = 0; r < ROUNDS; r++) {
      const unitIdx = (chosenOffset - t + r + unitCount * ROUNDS) % unitCount;
      const unit = units[unitIdx];
      for (const cast of unit) {
        // 空席ユーザー用のmatchesにはrank:0をセット
        tableMatches.push({ cast, rank: 0 });
      }
    }

    /* 実ユーザーのスロットを生成 */
    for (const user of tables[t]) {
      const matches: MatchedCast[] = [];
      for (let r = 0; r < ROUNDS; r++) {
        const unitIdx = (chosenOffset - t + r + unitCount * ROUNDS) % unitCount; // テーブル1→2の順に巡回
        const unit = units[unitIdx];
        for (const cast of unit) {
          const rank = getPreferenceRank(user, cast.name);
          matches.push({
            cast,
            rank,
          });
        }
      }
      userMap.set(user.x_id, matches);
      tableSlots.push({
        user,
        matches,
        tableIndex: t + 1, // 1-based テーブル番号
      });
    }

    /* 空席スロットを生成（端数テーブルの場合のみ） */
    const vacantCount = usersPerTable - tables[t].length;
    for (let v = 0; v < vacantCount; v++) {
      tableSlots.push({
        user: null,
        matches: tableMatches.map((m) => ({ ...m })), // 各空席に独立コピー
        tableIndex: t + 1,
      });
    }
  }

  return { userMap, tableSlots };
}

