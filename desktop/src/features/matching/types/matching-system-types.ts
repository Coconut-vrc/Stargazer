/**
 * マッチングシステム機能追加仕様に基づく型定義。
 * 仕様書: docs/matching-system-specification.md
 */

/** NG判定基準 */
export type NGJudgmentType = 'username' | 'accountId' | 'either';

/** マッチング時の挙動 */
export type NGMatchingBehavior = 'warn' | 'exclude';

/** NGユーザー1件（ユーザー名 or アカウントID or 両方） */
export interface NGUserEntry {
  username?: string;
  accountId?: string;
}

/** キャストごとのNG設定（拡張用。既存 ng_users: string[] と併用） */
export interface NGUserSetting {
  castId: string;
  ngUsers: NGUserEntry[];
  judgmentType: NGJudgmentType;
  matchingBehavior: NGMatchingBehavior;
}

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
