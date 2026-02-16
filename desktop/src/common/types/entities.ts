export interface UserBean {
  timestamp: string;
  name: string;
  x_id: string;
  vrc_url?: string; // VRCアカウントURL(オプション)
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

export interface CastBean {
  name: string;
  is_present: boolean;
  /** 連絡先URL一覧（VRCプロフィール・X・Discord等）。＋で複数追加可能 */
  contact_urls?: string[];
  /** 従来のNGリスト（ユーザー名のみ）。後方互換のため残す */
  ng_users: string[];
  /** 仕様準拠のNGリスト（ユーザー名・アカウントID）。あればこちらを優先 */
  ng_entries?: NGUserEntry[];
}
