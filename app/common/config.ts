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
  /** セッション復元用：当選者・総テーブル数・営業モード・マッチング方式（端末内のみ保持） */
  SESSION: 'chocomelapp_session',
} as const;

/** URL履歴の最大件数（前回分＝1件のみ保持） */
export const URL_HISTORY_MAX = 1;
