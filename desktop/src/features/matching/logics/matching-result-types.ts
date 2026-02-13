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
