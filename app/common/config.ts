/**
 * アプリ設定・キー・定数の一元管理
 * 変更時はこのファイルのみ修正すればよい（Cursor もここを参照しやすい）
 */

/** localStorage キー */
export const STORAGE_KEYS = {
  /** セッション復元用：当選者・総テーブル数・営業モード・マッチング方式（端末内のみ保持） */
  SESSION: 'chocomelapp_session',
} as const;
