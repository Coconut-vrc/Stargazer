/**
 * アプリ設定・キー・定数の一元管理
 * 変更時はこのファイルのみ修正すればよい（Cursor もここを参照しやすい）
 */

/** localStorage キー */
export const STORAGE_KEYS = {
  /** 応募者名簿URL履歴 */
  USER_URL_HISTORY: 'chocomelapp_user_url_history',
  /** キャスト名簿URL履歴 */
  CAST_URL_HISTORY: 'chocomelapp_cast_url_history',
} as const;

/** URL履歴の最大件数 */
export const URL_HISTORY_MAX = 10;
