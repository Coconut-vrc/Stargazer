/**
 * 要注意人物の判定（仕様書 2-1）。
 * 判定条件: ユーザー名 AND アカウントID の両方が一致（厳密）。
 */

import type { UserBean, CastBean } from '@/common/types/entities';
import { isUserNGForCast } from './ng-judgment';
import type { NGJudgmentType } from '@/features/matching/types/matching-system-types';
import type { CautionUser } from '@/features/matching/types/matching-system-types';

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** 応募ユーザーが要注意リストの誰かと一致するか（name AND accountId） */
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

/** 例外リストに一致すれば警告を出さない（name AND accountId 両方一致） */
export function isNGException(
  user: UserBean,
  exceptions: { username: string; accountId: string }[],
): boolean {
  const nameNorm = normalize(user.name);
  const idNorm = normalize(user.x_id);
  return exceptions.some(
    (e) => normalize(e.username) === nameNorm && normalize(e.accountId) === idNorm,
  );
}

/**
 * 応募リストのユーザーについて、何人のキャストがそのユーザーをNGにしているか集計し、
 * 閾値以上なら要注意リスト用のエントリを返す（仕様: ユーザー名 AND アカウントID の両方で厳密一致）。
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
    let count = 0;
    for (const cast of casts) {
      if (isUserNGForCast(user, cast, judgmentType)) count += 1;
    }
    if (count >= threshold && user.name.trim() && user.x_id.trim()) {
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
