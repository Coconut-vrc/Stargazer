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
