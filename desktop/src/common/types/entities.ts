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

/** NGユーザー1件（仕様: username / accountId / 両方） */
export interface NGUserEntry {
  username?: string;
  accountId?: string;
}

export interface CastBean {
  name: string;
  is_present: boolean;
  /** 従来のNGリスト（ユーザー名のみ）。後方互換のため残す */
  ng_users: string[];
  /** 仕様準拠のNGリスト（ユーザー名・アカウントID）。あればこちらを優先 */
  ng_entries?: NGUserEntry[];
}
