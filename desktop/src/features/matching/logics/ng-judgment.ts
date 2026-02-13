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

function matchEntry(user: UserBean, entry: NGUserEntry, judgmentType: NGJudgmentType): boolean {
  const nameMatch =
    entry.username !== undefined &&
    entry.username.trim() !== '' &&
    normalize(user.name) === normalize(entry.username);
  const idMatch =
    entry.accountId !== undefined &&
    entry.accountId.trim() !== '' &&
    normalize(user.x_id) === normalize(entry.accountId);

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
