/**
 * アプリ設定・キー・定数の一元管理。
 * ビルド対象（Tauri Desktop / Android）で同一バンドルを利用。環境依存は tauri.ts の isTauri() で分岐。
 */

export const STORAGE_KEYS = {
  SESSION: 'chocomelapp_session',
  THEME: 'stargazer_theme_id',
  MATCHING_SETTINGS: 'stargazer_matching_settings',
  LAUNCH_BEHAVIOR: 'stargazer_launch_behavior',
  SIDEBAR_COLLAPSED: 'stargazer_sidebar_collapsed',
} as const;

/** 起動時の画面遷移 */
export type LaunchBehavior = 'top' | 'last';
