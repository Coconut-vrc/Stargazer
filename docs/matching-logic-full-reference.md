# Stargazer マッチングロジック ソースコード全量

**生成日:** 2026-02-14  
**目的:** 第三者レビュー用。マッチングに関わる全ソースファイルをそのまま収録。

---

## ファイル一覧

| # | パス | 役割 |
|---|------|------|
| 1 | `desktop/src/common/types/entities.ts` | データ型定義（UserBean, CastBean, NGUserEntry） |
| 2 | `desktop/src/features/matching/types/matching-system-types.ts` | マッチング固有の型定義 |
| 3 | `desktop/src/features/matching/types/matching-type-codes.ts` | 区分コード M001〜M006 |
| 4 | `desktop/src/features/matching/logics/matching-result-types.ts` | マッチング結果型 |
| 5 | `desktop/src/features/matching/logics/ng-judgment.ts` | NG判定ロジック |
| 6 | `desktop/src/features/matching/logics/caution-user.ts` | 要注意人物ロジック |
| 7 | `desktop/src/features/matching/logics/matching_service.ts` | エントリポイント（振り分け＋警告付与） |
| 8 | `desktop/src/features/matching/logics/complete-random.ts` | M001: 完全ランダム |
| 9 | `desktop/src/features/matching/logics/complete-rotation.ts` | M002: 完全ローテーション |
| 10 | `desktop/src/features/matching/logics/vacant-random.ts` | M003: 空席込みランダム |
| 11 | `desktop/src/features/matching/logics/vacant-rotation.ts` | M004: 空席込みローテーション |
| 12 | `desktop/src/features/matching/logics/group-matching.ts` | M005: グループマッチング（スタブ） |
| 13 | `desktop/src/features/matching/logics/multiple-matching.ts` | M006: 複数マッチング（スタブ） |
| 14 | `desktop/src/features/matching/stores/matching-settings-store.ts` | 設定の永続化 |

---

## 1. `desktop/src/common/types/entities.ts`

```typescript
export interface UserBean {
  timestamp: string;
  name: string;
  x_id: string;
  first_flag: string;
  casts: string[];
  note: string;
  is_pair_ticket: boolean;
  raw_extra: unknown[];
}

/** NGユーザー1件（仕様: username / accountId）。登録時は名前＋X ID。 */
export interface NGUserEntry {
  username?: string;
  accountId?: string;
}

/** 自由形式の連絡先エントリ（形式チェックなし） */
export interface ContactLink {
  label: string;   // 例: "Discord", "LINE", "メール" など
  value: string;   // URL・ID・テキストなど自由入力
}

export interface CastBean {
  name: string;
  is_present: boolean;
  /** 従来のNGリスト（ユーザー名のみ）。後方互換のため残す */
  ng_users: string[];
  /** 仕様準拠のNGリスト（ユーザー名・アカウントID）。あればこちらを優先 */
  ng_entries?: NGUserEntry[];
  /** X（旧Twitter）ID または URL。@username 形式で表示し x.com へリンク */
  x_id?: string;
  /** VRChat プロフィールURL。入力されると「VRCプロフへ」リンクとして表示 */
  vrc_profile_url?: string;
  /** 自由形式の連絡先リスト（X・VRC以外の連絡手段） */
  contacts?: ContactLink[];
}
```

---

## 2. `desktop/src/features/matching/types/matching-system-types.ts`

```typescript
/**
 * マッチングシステム機能追加仕様に基づく型定義。
 * 仕様書: docs/matching-system-specification.md
 *
 * NGUserEntry の正の定義は common/types/entities.ts にある。
 * このファイルでは re-export のみ行い、マッチング固有の型を定義する。
 */

/** NGUserEntry は entities.ts を正とする（username + accountId の2フィールド構成） */
export type { NGUserEntry } from '@/common/types/entities';

/** NG判定基準 */
export type NGJudgmentType = 'username' | 'accountId' | 'either';

/** マッチング時の挙動 */
export type NGMatchingBehavior = 'warn' | 'exclude';

/** 警告モード用のマッチング結果1スロット */
export interface MatchedCastWithWarning {
  cast: { name: string; is_present: boolean; ng_users: string[] };
  rank: number;
  isNGWarning: boolean;
  ngReason?: string;
}

/** 要注意人物（ユーザー名 AND アカウントID の両方で厳密一致） */
export interface CautionUser {
  username: string;
  accountId: string;
  registrationType: 'auto' | 'manual';
  ngCastCount?: number;
  registeredAt: string; // ISO
}

export interface CautionUserSettings {
  autoRegisterThreshold: number;
  cautionUsers: CautionUser[];
}

/** NG例外（応募リストの警告抑制のみ。キャストNGには影響しない） */
export interface NGException {
  username: string;
  accountId: string;
  registeredAt: string;
  note?: string;
}

export interface NGExceptionSettings {
  exceptions: NGException[];
}

/** マッチング方式（UI用） */
export type MatchingAlgorithmId =
  | 'complete-random'      // 1. 完全ランダム
  | 'complete-rotation'    // 2. 完全ローテーション
  | 'vacant-random'        // 3. 空席込みランダム
  | 'vacant-rotation'      // 4. 空席込みローテーション
  | 'group'                // 5. グループマッチング
  | 'multiple';            // 6. 複数マッチング

export interface GroupMatchingSettings {
  groupCount: number;
  usersPerGroup: number;
  rotationCount: number;
}

export interface MultipleMatchingSettings {
  usersPerTable: number;
  castsPerRotation: number;
  rotationCount: number;
}
```

---

## 3. `desktop/src/features/matching/types/matching-type-codes.ts`

```typescript
/**
 * マッチング形式の区分コード（仕様 4-1）。
 * 抽選条件で選択する6種類。ロジックは M001～M006 で完全分離。
 */

export const MATCHING_TYPE_CODES = [
  'M001',
  'M002',
  'M003',
  'M004',
  'M005',
  'M006',
] as const;

export type MatchingTypeCode = (typeof MATCHING_TYPE_CODES)[number];

/** プルダウン用ラベル（仕様 4-1 の1～6に対応） */
export const MATCHING_TYPE_LABELS: Record<MatchingTypeCode, string> = {
  M001: '完全ランダムマッチング',
  M002: '完全ローテーションマッチング',
  M003: '空席込みランダムマッチング',
  M004: '空席込みローテーションマッチング',
  M005: 'グループマッチング',
  M006: '複数マッチング',
};

/** 完全マッチング（空席なし）＝ M001, M002 */
export function isCompleteMatching(code: MatchingTypeCode): boolean {
  return code === 'M001' || code === 'M002';
}

/** 空席ありマッチング ＝ M003, M004（総テーブル数が必要） */
export function isVacantMatching(code: MatchingTypeCode): boolean {
  return code === 'M003' || code === 'M004';
}

/** ローテーション方式 ＝ M002, M004 */
export function isRotationMatching(code: MatchingTypeCode): boolean {
  return code === 'M002' || code === 'M004';
}
```

---

## 4. `desktop/src/features/matching/logics/matching-result-types.ts`

```typescript
/**
 * マッチング結果の型定義（仕様書 5. ファイル構成案）。
 * 各ロジックが返す共通の型。ロジック間の共通化は行わない。
 */

import type { UserBean, CastBean } from '@/common/types/entities';

export interface MatchedCast {
  cast: CastBean;
  rank: number;
  isNGWarning?: boolean;
  ngReason?: string;
}

export interface TableSlot {
  user: UserBean | null;
  matches: MatchedCast[];
}

export type MatchingResult = {
  userMap: Map<string, MatchedCast[]>;
  tableSlots?: TableSlot[];
};
```

---

## 5. `desktop/src/features/matching/logics/ng-judgment.ts`

```typescript
/**
 * NGユーザー判定ロジック（仕様書 1-1 に基づく）。
 * 判定基準: ユーザー名のみ / アカウントIDのみ / どちらか片方一致。
 * 大文字小文字・前後空白はトリムして比較。
 */

import type { UserBean, CastBean, NGUserEntry } from '@/common/types/entities';
import type { NGJudgmentType } from '@/features/matching/types/matching-system-types';

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function normalizeIdForCompare(s: string): string {
  const n = normalize(s);
  return n.startsWith('@') ? n.slice(1) : n;
}

function matchEntry(user: UserBean, entry: NGUserEntry, judgmentType: NGJudgmentType): boolean {
  const nameMatch =
    entry.username !== undefined &&
    entry.username.trim() !== '' &&
    normalize(user.name) === normalize(entry.username);
  const idMatch =
    entry.accountId !== undefined &&
    entry.accountId.trim() !== '' &&
    normalizeIdForCompare(user.x_id) === normalizeIdForCompare(entry.accountId);

  if (judgmentType === 'username') return nameMatch;
  if (judgmentType === 'accountId') return idMatch;
  return nameMatch || idMatch;
}

/**
 * キャストのNGリスト（ng_entries または ng_users）に対してユーザーがNGかどうか判定する。
 */
export function isUserNGForCast(
  user: UserBean,
  cast: CastBean,
  judgmentType: NGJudgmentType,
): boolean {
  const entries = cast.ng_entries;
  if (entries && entries.length > 0) {
    return entries.some((entry) => matchEntry(user, entry, judgmentType));
  }
  const legacyList = cast.ng_users ?? [];
  if (legacyList.length === 0) return false;
  const nameNorm = normalize(user.name);
  const idNorm = normalize(user.x_id);
  for (const s of legacyList) {
    const t = normalize(s);
    if (judgmentType === 'username' && nameNorm === t) return true;
    if (judgmentType === 'accountId' && idNorm === t) return true;
    if (judgmentType === 'either' && (nameNorm === t || idNorm === t)) return true;
  }
  return false;
}

/**
 * NG理由文言を返す（警告モード表示用）。
 */
export function getNGReasonForCast(castName: string): string {
  return `このユーザーはキャスト「${castName}」のNG対象です`;
}
```

---

## 6. `desktop/src/features/matching/logics/caution-user.ts`

```typescript
/**
 * 要注意人物の判定・自動登録（仕様書 2-1）。
 *
 * - NGカウント（自動登録）: 1-1 の判定基準 (ngJudgmentType) に従う
 * - 同一人物判定 (isCautionUser): ユーザー名 AND アカウントID の両方一致（厳密 AND）
 * - NG例外判定 (isNGException): ユーザー名 AND アカウントID の両方一致（厳密 AND）
 */

import type { UserBean, CastBean } from '@/common/types/entities';
import type { NGJudgmentType, CautionUser, NGException } from '@/features/matching/types/matching-system-types';
import { isUserNGForCast } from '@/features/matching/logics/ng-judgment';

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/^@/, '');
}

/**
 * 応募ユーザーが要注意リストの誰かと一致するか。
 * 仕様 2-1: ユーザー名 AND アカウントID の両方が一致（厳密）。
 * どちらか片方だけが一致しても別人として扱う。
 */
export function isCautionUser(
  user: UserBean,
  cautionUsers: CautionUser[],
): boolean {
  const nameNorm = normalize(user.name);
  const idNorm = normalize(user.x_id);
  return cautionUsers.some(
    (c) => normalize(c.username) === nameNorm && normalize(c.accountId) === idNorm,
  );
}

/**
 * 例外リストに一致すれば警告を出さない。
 * 仕様 3-2/3-3: ユーザー名 AND アカウントID の両方が一致（厳密）。
 * accountId がない場合は例外判定不可。
 */
export function isNGException(
  user: UserBean,
  exceptions: NGException[],
): boolean {
  const nameNorm = normalize(user.name);
  const idNorm = normalize(user.x_id);
  return exceptions.some(
    (e) => normalize(e.username) === nameNorm && normalize(e.accountId) === idNorm,
  );
}

/**
 * 応募リストのユーザーについて、何人のキャストがそのユーザーをNGにしているか集計し、
 * 閾値以上なら要注意リスト用のエントリを返す。
 *
 * カウントロジック:
 *   - 各キャストのNGリストとの照合は ngJudgmentType（設定画面で選択）に従う。
 *     これにより username のみのレガシー ng_entries / ng_users もカウント対象になる。
 *   - isUserNGForCast を再利用し、ng-judgment.ts と一貫した判定を行う。
 *
 * 登録される CautionUser:
 *   - 応募ユーザーの username / accountId(x_id) の両方が揃っている場合のみ登録。
 *     これにより isCautionUser（厳密 AND）で正しくマッチできる。
 */
export function computeAutoCautionUsers(
  casts: CastBean[],
  applyUsers: UserBean[],
  judgmentType: NGJudgmentType,
  threshold: number,
): CautionUser[] {
  const result: CautionUser[] = [];
  const now = new Date().toISOString();
  for (const user of applyUsers) {
    const nameNorm = normalize(user.name);
    const idNorm = normalize(user.x_id);
    // 登録される CautionUser には両方必要（isCautionUser が厳密 AND のため）
    if (!nameNorm || !idNorm) continue;

    let count = 0;
    for (const cast of casts) {
      // NG判定は ngJudgmentType に従う（username-only エントリでも判定可能）
      if (isUserNGForCast(user, cast, judgmentType)) count += 1;
    }
    if (count >= threshold) {
      result.push({
        username: user.name.trim(),
        accountId: user.x_id.trim(),
        registrationType: 'auto',
        ngCastCount: count,
        registeredAt: now,
      });
    }
  }
  return result;
}
```

---

## 7. `desktop/src/features/matching/logics/matching_service.ts`

```typescript
/**
 * マッチング実行のエントリポイント（仕様 5. ファイル構成案）。
 * ロジックは区分コード（M001～M006）で完全分離。各ロジックは logic/ 配下の独立ファイルを参照。
 * ここでは振り分けと警告モードの付与のみ行う。
 */

import type { UserBean, CastBean } from '@/common/types/entities';
import type { MatchingTypeCode } from '@/features/matching/types/matching-type-codes';
import { isUserNGForCast, getNGReasonForCast } from './ng-judgment';
import type { NGJudgmentType, NGMatchingBehavior } from '@/features/matching/types/matching-system-types';
import type { MatchedCast, TableSlot, MatchingResult } from './matching-result-types';
import { runCompleteRandom } from './complete-random';
import { runCompleteRotation } from './complete-rotation';
import { runVacantRandom } from './vacant-random';
import { runVacantRotation } from './vacant-rotation';
import { runGroupMatching } from './group-matching';
import { runMultipleMatching } from './multiple-matching';

export type { MatchedCast, TableSlot, MatchingResult } from './matching-result-types';

export interface MatchingRunOptions {
  rotationCount: number;
  totalTables?: number;
  groupCount?: number;
  usersPerGroup?: number;
  usersPerTable?: number;
  castsPerRotation?: number;
}

export class MatchingService {
  static runMatching(
    winners: UserBean[],
    allCasts: CastBean[],
    matchingTypeCode: MatchingTypeCode,
    options: MatchingRunOptions,
    ngJudgmentType: NGJudgmentType = 'either',
    ngMatchingBehavior: NGMatchingBehavior = 'exclude',
  ): MatchingResult {
    const activeCasts = allCasts.filter((c) => c.is_present);
    const userMap = new Map<string, MatchedCast[]>();
    if (winners.length === 0 || activeCasts.length === 0) {
      return attachWarnings(
        { userMap },
        winners,
        ngJudgmentType,
        ngMatchingBehavior,
      );
    }

    const ROUNDS = Math.max(1, options.rotationCount || 1);
    let result: MatchingResult;

    switch (matchingTypeCode) {
      case 'M001':
        result = runCompleteRandom(
          winners,
          allCasts,
          ROUNDS,
          ngJudgmentType,
          ngMatchingBehavior,
        );
        break;
      case 'M002':
        result = runCompleteRotation(
          winners,
          allCasts,
          ROUNDS,
          ngJudgmentType,
          ngMatchingBehavior,
        );
        break;
      case 'M003':
        result = runVacantRandom(
          winners,
          allCasts,
          ROUNDS,
          options.totalTables ?? winners.length,
          ngJudgmentType,
          ngMatchingBehavior,
        );
        break;
      case 'M004':
        result = runVacantRotation(
          winners,
          allCasts,
          ROUNDS,
          options.totalTables ?? winners.length,
          ngJudgmentType,
          ngMatchingBehavior,
        );
        break;
      case 'M005':
        result = runGroupMatching(
          winners,
          allCasts,
          {
            groupCount: options.groupCount ?? 1,
            usersPerGroup: options.usersPerGroup ?? 1,
            rotationCount: ROUNDS,
          },
          ngJudgmentType,
          ngMatchingBehavior,
        );
        break;
      case 'M006':
        result = runMultipleMatching(
          winners,
          allCasts,
          {
            usersPerTable: options.usersPerTable ?? 1,
            castsPerRotation: options.castsPerRotation ?? 1,
            rotationCount: ROUNDS,
          },
          ngJudgmentType,
          ngMatchingBehavior,
        );
        break;
      default:
        result = { userMap };
    }

    return attachWarnings(result, winners, ngJudgmentType, ngMatchingBehavior);
  }
}

function attachWarnings(
  res: MatchingResult,
  winners: UserBean[],
  ngJudgmentType: NGJudgmentType,
  ngMatchingBehavior: NGMatchingBehavior,
): MatchingResult {
  if (ngMatchingBehavior !== 'warn') return res;
  res.userMap.forEach((matches, xId) => {
    const user = winners.find((w) => w.x_id === xId);
    if (!user) return;
    matches.forEach((m) => {
      m.isNGWarning = isUserNGForCast(user, m.cast, ngJudgmentType);
      m.ngReason = m.isNGWarning ? getNGReasonForCast(m.cast.name) : undefined;
    });
  });
  res.tableSlots?.forEach((slot: TableSlot) => {
    const user = slot.user;
    slot.matches.forEach((m) => {
      m.isNGWarning = user ? isUserNGForCast(user, m.cast, ngJudgmentType) : false;
      m.ngReason = m.isNGWarning ? getNGReasonForCast(m.cast.name) : undefined;
    });
  });
  return res;
}
```

---

## 8. `desktop/src/features/matching/logics/complete-random.ts`

```typescript
/**
 * ロジック1: 完全ランダムマッチング（仕様 4-2）
 * 旧名称: 特別営業（ランダム）
 * 全ユーザーに必ずキャストを配置。空席なし。ランダムに配置。
 * 区分コードで完全分離。他ロジックと共通化しない。
 */

import type { UserBean, CastBean } from '@/common/types/entities';
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
```

---

## 9. `desktop/src/features/matching/logics/complete-rotation.ts`

```typescript
/**
 * ロジック2: 完全ローテーションマッチング（仕様 4-2）
 * 旧名称: 特別営業（ローテーション）
 * 全ユーザーに必ずキャストを配置。空席なし。順番に回る。
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

export function runCompleteRotation(
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
  const userCount = winners.length;
  const castCount = shuffledCasts.length;
  const slotCount = Math.min(userCount, castCount);
  const baseCasts = shuffledCasts.slice(0, slotCount);
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
    const tableSlots = buildTableSlots(
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
  const tableSlots = buildTableSlots(
    baseCasts,
    winners,
    ROUNDS,
    chosenOffset,
    slotCount,
    getPreferenceRank,
  );
  return { userMap, tableSlots };
}
```

---

## 10. `desktop/src/features/matching/logics/vacant-random.ts`

```typescript
/**
 * ロジック3: 空席込みランダムマッチング（仕様 4-2）
 * 旧名称: 通常営業（ランダム）
 * 空席あり得る。ランダム配置。
 * 区分コードで完全分離。他ロジックと共通化しない。
 */

import type { UserBean, CastBean } from '@/common/types/entities';
import type { MatchedCast, TableSlot, MatchingResult } from './matching-result-types';
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

export function runVacantRandom(
  winners: UserBean[],
  allCasts: CastBean[],
  rotationCount: number,
  totalTables: number,
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

  const tableSlots: TableSlot[] = [];
  for (let row = 0; row < totalTables; row++) {
    const user = row < winners.length ? winners[row] : null;
    const matches = user ? resultMap.get(user.x_id) ?? [] : [];
    tableSlots.push({ user, matches });
  }
  return { userMap: resultMap, tableSlots };
}
```

---

## 11. `desktop/src/features/matching/logics/vacant-rotation.ts`

```typescript
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
```

---

## 12. `desktop/src/features/matching/logics/group-matching.ts`

```typescript
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
```

---

## 13. `desktop/src/features/matching/logics/multiple-matching.ts`

```typescript
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
```

---

## 14. `desktop/src/features/matching/stores/matching-settings-store.ts`

```typescript
/**
 * マッチング関連設定の永続化（localStorage）。
 * NG判定基準・挙動・要注意人物・NG例外を保持。他画面に影響しない。
 */

import { STORAGE_KEYS } from '@/common/config';
import type {
  NGJudgmentType,
  NGMatchingBehavior,
  CautionUser,
  CautionUserSettings,
  NGException,
  NGExceptionSettings,
} from '@/features/matching/types/matching-system-types';

const DEFAULT_JUDGMENT: NGJudgmentType = 'either';
const DEFAULT_BEHAVIOR: NGMatchingBehavior = 'exclude';
const DEFAULT_CAUTION_THRESHOLD = 2;

export interface MatchingSettingsState {
  ngJudgmentType: NGJudgmentType;
  ngMatchingBehavior: NGMatchingBehavior;
  caution: CautionUserSettings;
  ngExceptions: NGExceptionSettings;
}

function loadFromStorage(): MatchingSettingsState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATCHING_SETTINGS);
    if (!raw) return null;
    const d = JSON.parse(raw) as unknown;
    if (!d || typeof d !== 'object') return null;
    const o = d as Record<string, unknown>;
    const judgment = o.ngJudgmentType;
    const behavior = o.ngMatchingBehavior;
    const caution = o.caution as CautionUserSettings | undefined;
    const ngExceptions = o.ngExceptions as NGExceptionSettings | undefined;
    return {
      ngJudgmentType:
        judgment === 'username' || judgment === 'accountId' || judgment === 'either'
          ? judgment
          : DEFAULT_JUDGMENT,
      ngMatchingBehavior: behavior === 'warn' || behavior === 'exclude' ? behavior : DEFAULT_BEHAVIOR,
      caution: normalizeCautionSettings(caution),
      ngExceptions: normalizeNGExceptionSettings(ngExceptions),
    };
  } catch {
    return null;
  }
}

function normalizeCautionSettings(caution: CautionUserSettings | undefined): CautionUserSettings {
  if (!caution || !Array.isArray(caution.cautionUsers)) {
    return {
      autoRegisterThreshold: DEFAULT_CAUTION_THRESHOLD,
      cautionUsers: [],
    };
  }
  const threshold =
    typeof caution.autoRegisterThreshold === 'number' && caution.autoRegisterThreshold >= 1
      ? caution.autoRegisterThreshold
      : DEFAULT_CAUTION_THRESHOLD;
  const users = caution.cautionUsers.filter(
    (u): u is CautionUser =>
      typeof u === 'object' &&
      u !== null &&
      typeof u.username === 'string' &&
      typeof u.accountId === 'string' &&
      (u.registrationType === 'auto' || u.registrationType === 'manual'),
  );
  return { autoRegisterThreshold: threshold, cautionUsers: users };
}

function normalizeNGExceptionSettings(
  ngExceptions: NGExceptionSettings | undefined,
): NGExceptionSettings {
  if (!ngExceptions || !Array.isArray(ngExceptions.exceptions)) {
    return { exceptions: [] };
  }
  const exceptions = ngExceptions.exceptions.filter(
    (e): e is NGException =>
      typeof e === 'object' &&
      e !== null &&
      typeof e.username === 'string' &&
      typeof e.accountId === 'string',
  );
  return { exceptions };
}

export function getInitialMatchingSettings(): MatchingSettingsState {
  const loaded = loadFromStorage();
  if (loaded) return loaded;
  return {
    ngJudgmentType: DEFAULT_JUDGMENT,
    ngMatchingBehavior: DEFAULT_BEHAVIOR,
    caution: { autoRegisterThreshold: DEFAULT_CAUTION_THRESHOLD, cautionUsers: [] },
    ngExceptions: { exceptions: [] },
  };
}

export function persistMatchingSettings(state: MatchingSettingsState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.MATCHING_SETTINGS, JSON.stringify(state));
  } catch (e) {
    console.warn('マッチング設定の保存に失敗しました', e);
  }
}
```
